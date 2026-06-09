const { Complaint, User, Department, Evidence, InvestigationLog, Op } = require('../models/models');
const { logEvent } = require('../utils/auditLogger');
const path = require('path');
const fs = require('fs');

// 1. Submit a complaint
const submitComplaint = async (req, res) => {
  try {
    const { category, description, dateOfOccurrence, locationAddress, gpsCoordinates, priority, confidentiality } = req.body;

    if (!category || !description || !dateOfOccurrence || !locationAddress) {
      return res.status(400).json({ success: false, message: 'Category, description, date of occurrence, and location are required.' });
    }

    // Determine type (internal staff vs external citizen)
    const userRole = req.user.role;
    const type = userRole === 'staff' ? 'internal' : 'external';

    // Validate categories depending on scope
    const allowedCitizenCats = ['environmental', 'service_delivery', 'administrative', 'personal'];
    const allowedStaffCats = ['workplace', 'operational', 'administrative', 'personal'];
    const selectedCategory = category.toLowerCase();

    if (type === 'external' && !allowedCitizenCats.includes(selectedCategory)) {
      return res.status(400).json({ success: false, message: `Invalid category for citizen complaint. Allowed: [${allowedCitizenCats.join(', ')}]` });
    }
    if (type === 'internal' && !allowedStaffCats.includes(selectedCategory)) {
      return res.status(400).json({ success: false, message: `Invalid category for staff complaint. Allowed: [${allowedStaffCats.join(', ')}]` });
    }

    // Generate unique sequential tracking reference number: CMS-YYYY-XXXXX
    const currentYear = new Date().getFullYear();
    const complaintCount = await Complaint.count({
      where: {
        created_at: {
          [Op.gte]: new Date(`${currentYear}-01-01`),
          [Op.lt]: new Date(`${currentYear + 1}-01-01`)
        }
      }
    });
    const nextSequence = String(complaintCount + 1).padStart(5, '0');
    const trackingNumber = `CMS-${currentYear}-${nextSequence}`;

    // Create complaint record
    const newComplaint = await Complaint.create({
      tracking_number: trackingNumber,
      complainant_id: req.user.id,
      type,
      category: selectedCategory,
      description,
      date_of_occurrence: dateOfOccurrence,
      location_address: locationAddress,
      gps_coordinates: gpsCoordinates || null,
      priority: priority || 'medium',
      confidentiality: confidentiality || 'public',
      status: 'submitted'
    });

    // Handle evidence attachments uploaded via multer middleware
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await Evidence.create({
          complaint_id: newComplaint.id,
          uploader_id: req.user.id,
          file_name: file.originalname,
          file_path: `/uploads/${file.filename}`,
          file_size: file.size,
          file_type: file.mimetype,
          category: 'complainant'
        });
      }
    }

    // Write audit log
    await logEvent({
      userId: req.user.id,
      action: 'SUBMIT_COMPLAINT',
      targetId: newComplaint.id,
      details: `Complaint submitted successfully. Tracking Ref: ${trackingNumber}`
    }, req);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      trackingNumber,
      complaintId: newComplaint.id
    });
  } catch (error) {
    console.error('Complaint submission error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred during complaint submission.' });
  }
};

// 2. Track complaint status by tracking number (Guest / Complainant)
const trackComplaint = async (req, res) => {
  try {
    const { tracking_number } = req.params;

    const complaint = await Complaint.findOne({
      where: { tracking_number },
      include: [
        {
          model: Department,
          as: 'AssignedDepartment',
          attributes: ['name']
        },
        {
          model: Evidence,
          as: 'EvidenceFiles',
          attributes: ['file_name', 'file_path', 'file_type', 'file_size', 'created_at']
        },
        {
          model: InvestigationLog,
          as: 'Logs',
          attributes: ['activity_description', 'findings', 'created_at'],
          include: [{
            model: User,
            as: 'Officer',
            attributes: ['full_name']
          }]
        }
      ]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Invalid reference number. Please check the spelling and try again.' });
    }

    // Build chronological timeline of transitions based on standard status stages
    const stages = ['submitted', 'under_review', 'assigned', 'in_progress', 'pending_approval', 'resolved', 'rejected', 'appealed', 'closed'];
    const currentStatusIdx = stages.indexOf(complaint.status);
    
    const timeline = [];
    // We add historical entries for status milestones
    timeline.push({ status: 'submitted', timestamp: complaint.created_at, details: 'Complaint registered in database.' });
    
    if (complaint.assigned_department_id) {
      timeline.push({ 
        status: 'assigned', 
        timestamp: complaint.updated_at, 
        details: `Complaint routed to department: ${complaint.AssignedDepartment?.name || 'Department'}` 
      });
    }

    if (complaint.status === 'in_progress' || currentStatusIdx > stages.indexOf('assigned')) {
      timeline.push({ status: 'in_progress', timestamp: complaint.updated_at, details: 'Active investigation and compliance audits initiated.' });
    }

    if (complaint.status === 'resolved') {
      timeline.push({ 
        status: 'resolved', 
        timestamp: complaint.updated_at, 
        details: 'Grievance resolved. Decision published.',
        resolution: complaint.resolution_summary,
        actions: complaint.actions_taken
      });
    }

    if (complaint.status === 'rejected') {
      timeline.push({ status: 'rejected', timestamp: complaint.updated_at, details: 'Complaint rejected after review.' });
    }

    if (complaint.status === 'appealed') {
      timeline.push({ status: 'appealed', timestamp: complaint.updated_at, details: `Appeal filed: "${complaint.appeal_reason}"` });
    }

    return res.status(200).json({
      success: true,
      complaint: {
        trackingNumber: complaint.tracking_number,
        category: complaint.category,
        description: complaint.description,
        status: complaint.status,
        priority: complaint.priority,
        dateOfOccurrence: complaint.date_of_occurrence,
        locationAddress: complaint.location_address,
        gpsCoordinates: complaint.gps_coordinates,
        created_at: complaint.created_at,
        deadline: complaint.deadline,
        timeline,
        evidence: complaint.EvidenceFiles
      }
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 3. Fetch detailed list of all complaints (filtered by role constraints)
const getComplaints = async (req, res) => {
  try {
    const { role, id, departmentId } = req.user;
    let whereClause = {};

    // Enforce role-based viewing permissions
    if (role === 'citizen' || role === 'staff') {
      whereClause.complainant_id = id;
    } else if (role === 'officer') {
      whereClause.assigned_officer_id = id;
    } else if (role === 'dept_head') {
      whereClause.assigned_department_id = departmentId;
    }
    // Admin role has no filters, can view all.

    const complaints = await Complaint.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Complainant', attributes: ['full_name', 'email'] },
        { model: Department, as: 'AssignedDepartment', attributes: ['name'] },
        { model: User, as: 'AssignedOfficer', attributes: ['full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 4. Assign complaint to Department (Admin only)
const assignDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, deadline } = req.body;

    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Target Department ID is required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    // Transition status to 'assigned'
    complaint.assigned_department_id = parseInt(departmentId);
    complaint.deadline = deadline || null;
    complaint.status = 'assigned';
    await complaint.save();

    await logEvent({
      userId: req.user.id,
      action: 'ASSIGN_COMPLAINT_DEPT',
      targetId: complaint.id,
      details: `Complaint ${complaint.tracking_number} routed to department ID: ${departmentId}. Deadline: ${deadline || 'None'}`
    }, req);

    return res.status(200).json({ success: true, message: 'Complaint successfully routed to department.' });
  } catch (error) {
    console.error('Department assignment error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 5. Assign complaint to Officer (Department Head only)
const assignOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const { officerId, instructions } = req.body;

    if (!officerId) {
      return res.status(400).json({ success: false, message: 'Target Officer ID is required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    // Verify department constraints
    if (complaint.assigned_department_id !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only assign complaints within your department.' });
    }

    // Verify target officer belongs to same department
    const officer = await User.findOne({ where: { id: parseInt(officerId), department_id: req.user.departmentId } });
    if (!officer) {
      return res.status(400).json({ success: false, message: 'Target officer not found in your department.' });
    }

    complaint.assigned_officer_id = parseInt(officerId);
    // Keep or advance status as needed, usually stays assigned or shifts
    await complaint.save();

    // Create an investigation log entry detailing the assignment instructions
    await InvestigationLog.create({
      complaint_id: complaint.id,
      officer_id: officerId,
      activity_description: `Assigned case task by Department Head. Instructions: ${instructions || 'Conduct investigation.'}`
    });

    await logEvent({
      userId: req.user.id,
      action: 'ASSIGN_COMPLAINT_OFFICER',
      targetId: complaint.id,
      details: `Case ${complaint.tracking_number} delegated to Officer: ${officer.full_name}`
    }, req);

    return res.status(200).json({ success: true, message: 'Complaint successfully assigned to officer.' });
  } catch (error) {
    console.error('Officer assignment error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 6. Log Active Investigation Step (Officer only)
const logInvestigationStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { activityDescription, findings } = req.body;

    if (!activityDescription) {
      return res.status(400).json({ success: false, message: 'Activity description is required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    // Verify officer assigned constraint
    if (complaint.assigned_officer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not the assigned officer for this complaint.' });
    }

    // Move status to 'in_progress' on first log entry
    if (complaint.status === 'assigned') {
      complaint.status = 'in_progress';
      await complaint.save();
    }

    const newLog = await InvestigationLog.create({
      complaint_id: complaint.id,
      officer_id: req.user.id,
      activity_description: activityDescription,
      findings: findings || null
    });

    // Handle optional attachment uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await Evidence.create({
          complaint_id: complaint.id,
          uploader_id: req.user.id,
          file_name: file.originalname,
          file_path: `/uploads/${file.filename}`,
          file_size: file.size,
          file_type: file.mimetype,
          category: 'investigation'
        });
      }
    }

    await logEvent({
      userId: req.user.id,
      action: 'LOG_INVESTIGATION',
      targetId: complaint.id,
      details: `Logged investigation activity on ${complaint.tracking_number}`
    }, req);

    return res.status(201).json({ success: true, message: 'Investigation progress log recorded successfully.' });
  } catch (error) {
    console.error('Investigation log error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 7. Submit Resolution Decision (Officer only)
const submitResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionSummary, actionsTaken } = req.body;

    if (!resolutionSummary || !actionsTaken) {
      return res.status(400).json({ success: false, message: 'Resolution summary and actions taken are required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    if (complaint.assigned_officer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not the assigned officer.' });
    }

    complaint.resolution_summary = resolutionSummary;
    complaint.actions_taken = actionsTaken;
    complaint.status = 'pending_approval';

    // Handle resolution letter PDF upload if provided
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      complaint.resolution_letter_path = `/uploads/${file.filename}`;
      
      await Evidence.create({
        complaint_id: complaint.id,
        uploader_id: req.user.id,
        file_name: file.originalname,
        file_path: `/uploads/${file.filename}`,
        file_size: file.size,
        file_type: file.mimetype,
        category: 'resolution'
      });
    }

    await complaint.save();

    await logEvent({
      userId: req.user.id,
      action: 'SUBMIT_RESOLUTION',
      targetId: complaint.id,
      details: `Submitted resolution for ${complaint.tracking_number}. Pending approval.`
    }, req);

    return res.status(200).json({ success: true, message: 'Resolution submitted successfully. Pending approval.' });
  } catch (error) {
    console.error('Resolution submit error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 8. Approve/Reject Resolution (Department Head only)
const approveResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, feedback } = req.body; // 'approve' or 'reject'

    if (!decision) {
      return res.status(400).json({ success: false, message: 'Decision (approve/reject) is required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    if (complaint.assigned_department_id !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: 'Forbidden. This case belongs to another department.' });
    }

    if (decision === 'approve') {
      complaint.status = 'resolved';
      await complaint.save();

      // Log approving step
      await InvestigationLog.create({
        complaint_id: complaint.id,
        officer_id: req.user.id,
        activity_description: `Resolution APPROVED by Department Head. Feedback: ${feedback || 'Approved.'}`
      });

      await logEvent({
        userId: req.user.id,
        action: 'APPROVE_RESOLUTION',
        targetId: complaint.id,
        details: `Approved resolution for ${complaint.tracking_number}. Case resolved.`
      }, req);

      return res.status(200).json({ success: true, message: 'Resolution approved. Complaint status updated to resolved.' });
    } else {
      // Rejecting resolution pushes it back to 'in_progress' for more details
      complaint.status = 'in_progress';
      await complaint.save();

      await InvestigationLog.create({
        complaint_id: complaint.id,
        officer_id: req.user.id,
        activity_description: `Resolution REJECTED by Department Head. Feedback: ${feedback || 'Please conduct more analysis.'}`
      });

      await logEvent({
        userId: req.user.id,
        action: 'REJECT_RESOLUTION',
        targetId: complaint.id,
        details: `Rejected resolution for ${complaint.tracking_number}. Returned to in_progress queue.`
      }, req);

      return res.status(200).json({ success: true, message: 'Resolution rejected. Complaint sent back to officer.' });
    }
  } catch (error) {
    console.error('Resolution approval error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 9. File Appeal (Citizen or Staff complainant only, within 15 days)
const fileAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Appeal reason is required.' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    if (complaint.complainant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not the complainant.' });
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'You can only appeal complaints that are resolved or rejected.' });
    }

    // Verify 15-day limit
    const resolutionDate = new Date(complaint.updated_at);
    const now = new Date();
    const elapsedDays = (now - resolutionDate) / (1000 * 60 * 60 * 24);

    if (elapsedDays > 15) {
      return res.status(400).json({ success: false, message: 'The 15-day limit for filing an appeal has expired.' });
    }

    complaint.appeal_reason = reason;
    complaint.status = 'appealed';
    await complaint.save();

    await InvestigationLog.create({
      complaint_id: complaint.id,
      officer_id: req.user.id, // linked to the user's action
      activity_description: `Appeal submitted by Complainant. Reason: ${reason}`
    });

    await logEvent({
      userId: req.user.id,
      action: 'FILE_APPEAL',
      targetId: complaint.id,
      details: `Appeal successfully filed on complaint ${complaint.tracking_number}`
    }, req);

    return res.status(200).json({ success: true, message: 'Appeal successfully filed. Case reopened for review.' });
  } catch (error) {
    console.error('Appeal error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// 10. Get a single complaint detail by ID (authenticated, role-scoped)
const getComplaintDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId, departmentId } = req.user;

    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Enforce role-based access
    if (role === 'citizen' || role === 'staff') {
      if (complaint.complainant_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
    } else if (role === 'officer') {
      if (complaint.assigned_officer_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
    } else if (role === 'dept_head') {
      if (complaint.assigned_department_id !== departmentId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
    }
    // admin can see all

    return res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error('Get complaint detail error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

module.exports = {
  submitComplaint,
  trackComplaint,
  getComplaints,
  getComplaintDetail,
  assignDepartment,
  assignOfficer,
  logInvestigationStep,
  submitResolution,
  approveResolution,
  fileAppeal
};
