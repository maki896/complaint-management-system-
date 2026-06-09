const bcrypt = require('bcryptjs');
const { User, Department, AuditLog, Op } = require('../models/models');
const { logEvent } = require('../utils/auditLogger');

// Create a new Department (Admin only)
const createDepartment = async (req, res) => {
  try {
    const { name, description, region } = req.body;

    if (!name || !region) {
      return res.status(400).json({ success: false, message: 'Department name and region are required.' });
    }

    const existingDept = await Department.findOne({ where: { name } });
    if (existingDept) {
      return res.status(400).json({ success: false, message: 'A department with this name already exists.' });
    }

    const newDept = await Department.create({
      name,
      description,
      region
    });

    await logEvent({
      userId: req.user.id,
      action: 'CREATE_DEPARTMENT',
      targetId: newDept.id,
      details: `Created new department/directorate: ${name}`
    }, req);

    return res.status(201).json({ success: true, department: newDept });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Fetch all Departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        { model: User, as: 'Manager', attributes: ['id', 'full_name', 'email'] }
      ]
    });
    return res.status(200).json({ success: true, departments });
  } catch (error) {
    console.error('Fetch departments error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Create an Internal User Account and assign Role/Department (Admin only)
const createInternalUser = async (req, res) => {
  try {
    const { email, fullName, role, employeeId, departmentId, gender, phone, region, city, woreda, kebele } = req.body;

    if (!email || !fullName || !role || !employeeId || !gender || !phone || !region || !city || !woreda || !kebele) {
      return res.status(400).json({ success: false, message: 'All fields including employee ID and role are required.' });
    }

    // Verify allowed roles
    const allowedRoles = ['staff', 'officer', 'dept_head', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role selection. Must be one of: [${allowedRoles.join(', ')}]` });
    }

    // Check duplicate account
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { phone }, { employee_id: employeeId }] 
      } 
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email, phone, or employee ID is already in use.' });
    }

    // Generate a secure temporary random password
    const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    // Create profile
    const newInternalUser = await User.create({
      email,
      password_hash,
      full_name: fullName,
      role,
      employee_id: employeeId,
      department_id: departmentId || null,
      gender,
      phone,
      region,
      city,
      woreda,
      kebele,
      status: 'active'
    });

    // If role is dept_head, optionally set manager of target department
    if (role === 'dept_head' && departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (dept) {
        dept.manager_id = newInternalUser.id;
        await dept.save();
      }
    }

    await logEvent({
      userId: req.user.id,
      action: 'CREATE_INTERNAL_USER',
      targetId: newInternalUser.id,
      details: `Created new internal ${role} account: ${fullName} (${email}). Assigned employee ID: ${employeeId}`
    }, req);

    return res.status(201).json({
      success: true,
      message: 'Internal user account created successfully.',
      tempPassword,
      user: {
        id: newInternalUser.id,
        email: newInternalUser.email,
        fullName: newInternalUser.full_name,
        role: newInternalUser.role
      }
    });
  } catch (error) {
    console.error('Create internal user error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Fetch security audit trails (Admin only)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [
        { model: User, as: 'User', attributes: ['full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100 // Cap to prevent massive payloads
    });
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Fetch all system users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Department, as: 'Department', attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Fetch all users error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Fetch officers belonging to a specific department (Dept Head / Admin)
const getDeptOfficers = async (req, res) => {
  try {
    const { id } = req.params; // department id
    const { role, departmentId } = req.user;

    // Dept heads can only query their own department
    if (role === 'dept_head' && parseInt(id) !== departmentId) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only view officers in your own department.' });
    }

    const officers = await User.findAll({
      where: { department_id: parseInt(id), role: 'officer' }
    });

    // Strip password hashes from response
    const safeOfficers = officers.map(u => {
      const obj = { ...u };
      delete obj.password_hash;
      delete obj._tableName;
      return obj;
    });

    return res.status(200).json({ success: true, officers: safeOfficers });
  } catch (error) {
    console.error('Fetch dept officers error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  createInternalUser,
  getAuditLogs,
  getAllUsers,
  getDeptOfficers
};
