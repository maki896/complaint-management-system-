const { Complaint, Department } = require('../models/models');

// Fetch dashboard statistical metrics and counts
const getDashboardStats = async (req, res) => {
  try {
    const { role, id, departmentId } = req.user;
    let whereClause = {};

    // Apply dashboard scope constraints based on user roles
    if (role === 'citizen' || role === 'staff') {
      whereClause.complainant_id = id;
    } else if (role === 'officer') {
      whereClause.assigned_officer_id = id;
    } else if (role === 'dept_head') {
      whereClause.assigned_department_id = departmentId;
    }

    // Fetch all complaints matching general scope
    const allComplaints = await Complaint.findAll({ where: whereClause });

    // 1. Calculations
    const totalComplaints = allComplaints.length;
    const resolvedCount = allComplaints.filter(c => c.status === 'resolved').length;
    const closedCount = allComplaints.filter(c => c.status === 'closed').length;
    const pendingCount = allComplaints.filter(c => 
      ['submitted', 'under_review', 'assigned', 'in_progress', 'pending_approval', 'appealed'].includes(c.status)
    ).length;

    // 2. Backlog calculation (active cases with past deadlines)
    const todayStr = new Date().toISOString().split('T')[0];
    const backlogCount = allComplaints.filter(c => 
      !['resolved', 'closed', 'rejected'].includes(c.status) && 
      c.deadline && 
      c.deadline < todayStr
    ).length;

    // 3. Category distribution aggregations
    const categoryMap = {};
    allComplaints.forEach(c => {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
    });
    const categoryStats = Object.keys(categoryMap).map(cat => ({
      category: cat,
      count: categoryMap[cat]
    }));

    // 4. Status distribution aggregations
    const statusMap = {};
    allComplaints.forEach(c => {
      statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    });
    const statusStats = Object.keys(statusMap).map(st => ({
      status: st,
      count: statusMap[st]
    }));

    // 5. Calculate resolution rate
    const totalFinished = resolvedCount + closedCount;
    const resolutionRate = totalComplaints > 0 
      ? ((totalFinished / totalComplaints) * 100).toFixed(2) + '%' 
      : '100.00%';

    return res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        resolvedCount,
        pendingCount,
        closedCount,
        backlogCount,
        resolutionRate,
        categoryStats,
        statusStats
      }
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

module.exports = {
  getDashboardStats
};
