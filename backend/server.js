const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Imports db connection, models and controllers
const sequelize = require('./config/db');
const { User, Department, Complaint, Evidence, InvestigationLog, AuditLog } = require('./models/models');
const { authenticateToken, requireRoles } = require('./middleware/authMiddleware');

const { registerCitizen, login, getProfile } = require('./controllers/authController');
const {
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
} = require('./controllers/complaintController');
const {
  createDepartment,
  getDepartments,
  createInternalUser,
  getAuditLogs,
  getAllUsers,
  getDeptOfficers
} = require('./controllers/adminController');
const { getDashboardStats } = require('./controllers/reportController');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. Security & Parsing Middlewares ---
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local file uploads on frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. Setup Physical Evidence Upload Directory ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// --- 3. Configure Multer File Upload Engine ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique, collision-resistant filenames using hashes
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file extensions
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.mp4', '.mp3'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: "${ext}". Allowed: PDF, Word, PNG, JPG, MP4, MP3`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // Enforces 25MB size restriction
  }
});

// Helper wrapper to handle multer errors gracefully
const handleUpload = (req, res, next) => {
  const uploadArray = upload.array('files', 5); // Allow max 5 files per submit
  uploadArray(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// --- 4. Route Routing Definitions ---

// Public & General Guest Routes
app.post('/api/auth/register', registerCitizen);
app.post('/api/auth/login', login);
app.get('/api/complaints/track/:tracking_number', trackComplaint);

// Complainant Protected Profile
app.get('/api/auth/profile', authenticateToken, getProfile);

// Complaint Management Routes
app.post('/api/complaints/submit', authenticateToken, handleUpload, submitComplaint);
app.get('/api/complaints', authenticateToken, getComplaints);
app.get('/api/complaints/:id/detail', authenticateToken, getComplaintDetail);

// Administrative Assignment & Workflow Routes
app.patch('/api/complaints/:id/assign-dept', authenticateToken, requireRoles('admin'), assignDepartment);
app.patch('/api/complaints/:id/assign-officer', authenticateToken, requireRoles('dept_head'), assignOfficer);

// Investigation, Resolution, approval, and appeals
app.post('/api/complaints/:id/investigate', authenticateToken, requireRoles('officer'), handleUpload, logInvestigationStep);
app.patch('/api/complaints/:id/resolve', authenticateToken, requireRoles('officer'), handleUpload, submitResolution);
app.patch('/api/complaints/:id/approve-resolution', authenticateToken, requireRoles('dept_head'), approveResolution);
app.post('/api/complaints/:id/appeal', authenticateToken, requireRoles('citizen', 'staff'), fileAppeal);

// Administrative System Setup Routes
app.post('/api/admin/departments/create', authenticateToken, requireRoles('admin'), createDepartment);
app.get('/api/admin/departments', authenticateToken, getDepartments);
app.post('/api/admin/users/create', authenticateToken, requireRoles('admin'), createInternalUser);
app.get('/api/admin/users', authenticateToken, requireRoles('admin'), getAllUsers);
app.get('/api/admin/departments/:id/officers', authenticateToken, requireRoles('dept_head', 'admin'), getDeptOfficers);
app.get('/api/admin/audit-logs', authenticateToken, requireRoles('admin'), getAuditLogs);

// Analytical Reporting Dashboards
app.get('/api/reports/dashboard', authenticateToken, getDashboardStats);

// --- 5. Bootloader & Database Synchronization ---
const startServer = async () => {
  try {
    // Synchronize Database schemas
    await sequelize.sync({ force: false });
    console.log('Database synced successfully.');

    // Seed Initial Core System Roles if not already populated
    await seedDatabase();

    // Startup Express server listener
    app.listen(PORT, () => {
      console.log(`Server successfully booted and listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Bootstrapping server failed:', error);
  }
};

// Database Seeder utility
const seedDatabase = async () => {
  try {
    console.log('Populating initial default structural profiles and departments...');

    // 1. Create Default Departments if they do not exist
    let envDept = await Department.findOne({ where: { name: 'Environmental Law Enforcement Directorate' } });
    if (!envDept) {
      envDept = await Department.create({
        name: 'Environmental Law Enforcement Directorate',
        description: 'Reviews and enforces environmental controls, pollution indices, and industrial emission compliance.',
        region: 'Oromia'
      });
    }
    
    let serviceDept = await Department.findOne({ where: { name: 'Bureau Service Delivery Directorate' } });
    if (!serviceDept) {
      serviceDept = await Department.create({
        name: 'Bureau Service Delivery Directorate',
        description: 'Maintains public satisfaction, processes delays, and optimizes administrative turnaround workflows.',
        region: 'Oromia'
      });
    }

    let adminDept = await Department.findOne({ where: { name: 'Internal Operations & Workplace Administration' } });
    if (!adminDept) {
      adminDept = await Department.create({
        name: 'Internal Operations & Workplace Administration',
        description: 'Resolves workplace conflicts, personnel grievances, and internal office logistics problems.',
        region: 'Oromia'
      });
    }

    // Hash credentials
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('AdminPassword123!', salt);
    const headPassword = await bcrypt.hash('HeadPassword123!', salt);
    const officerPassword = await bcrypt.hash('OfficerPassword123!', salt);
    const staffPassword = await bcrypt.hash('StaffPassword123!', salt);
    
    const deptHeadPassword = await bcrypt.hash('DeptHead123!', salt);
    const staff123Password = await bcrypt.hash('Staff123!', salt);
    const reviewerPassword = await bcrypt.hash('Reviewer123!', salt);
    const citizenPassword = await bcrypt.hash('Citizen123!', salt);

    // Helper to safely seed a user
    const ensureUserExists = async (userData) => {
      const existing = await User.findOne({ where: { email: userData.email } });
      if (!existing) {
        await User.create({
          failed_attempts: 0,
          locked_until: null,
          status: 'active',
          ...userData
        });
        console.log(`Seeded user: ${userData.email}`);
      }
    };

    // 2. Create Administrator Account
    await ensureUserExists({
      email: 'admin@oromia.gov.et',
      password_hash: adminPassword,
      full_name: 'System Administrator',
      role: 'admin',
      employee_id: 'EMP-ADMIN-01',
      gender: 'Female',
      phone: '+251900000001',
      region: 'Oromia',
      city: 'Addis Ababa',
      woreda: 'Woreda 01',
      kebele: 'Kebele 01'
    });

    // 3. Create Environmental Department Head
    await ensureUserExists({
      email: 'head.environmental@oromia.gov.et',
      password_hash: headPassword,
      full_name: 'Dr. Gemechu Desta',
      role: 'dept_head',
      employee_id: 'EMP-HEAD-01',
      department_id: envDept.id,
      gender: 'Male',
      phone: '+251900000002',
      region: 'Oromia',
      city: 'Adama',
      woreda: 'Woreda 02',
      kebele: 'Kebele 03'
    });

    // Set Manager reference for envDept if not set
    const envHead = await User.findOne({ where: { email: 'head.environmental@oromia.gov.et' } });
    if (envHead && envDept.manager_id !== envHead.id) {
      envDept.manager_id = envHead.id;
      await envDept.save();
    }

    // 4. Create Environmental Complaint Officer
    await ensureUserExists({
      email: 'officer.environmental@oromia.gov.et',
      password_hash: officerPassword,
      full_name: 'Aster Tolosa',
      role: 'officer',
      employee_id: 'EMP-OFFICER-01',
      department_id: envDept.id,
      gender: 'Female',
      phone: '+251900000003',
      region: 'Oromia',
      city: 'Adama',
      woreda: 'Woreda 02',
      kebele: 'Kebele 03'
    });

    // 5. Create Internal Bureau Staff
    await ensureUserExists({
      email: 'staff.bureau@oromia.gov.et',
      password_hash: staffPassword,
      full_name: 'Chala Kedir',
      role: 'staff',
      employee_id: 'EMP-STAFF-01',
      department_id: serviceDept.id,
      gender: 'Male',
      phone: '+251900000004',
      region: 'Oromia',
      city: 'Jimma',
      woreda: 'Woreda 05',
      kebele: 'Kebele 12'
    });

    // --- Seed the alternative credentials from summary list ---
    
    // 6. dept.head@oromia.gov.et
    await ensureUserExists({
      email: 'dept.head@oromia.gov.et',
      password_hash: deptHeadPassword,
      full_name: 'Tariku Megersa',
      role: 'dept_head',
      employee_id: 'EMP-HEAD-02',
      department_id: serviceDept.id,
      gender: 'Male',
      phone: '+251900000005',
      region: 'Oromia',
      city: 'Bishoftu',
      woreda: 'Woreda 01',
      kebele: 'Kebele 02'
    });

    // 7. staff@oromia.gov.et
    await ensureUserExists({
      email: 'staff@oromia.gov.et',
      password_hash: staff123Password,
      full_name: 'Lensa Gemeda',
      role: 'staff',
      employee_id: 'EMP-STAFF-02',
      department_id: serviceDept.id,
      gender: 'Female',
      phone: '+251900000006',
      region: 'Oromia',
      city: 'Nekemte',
      woreda: 'Woreda 03',
      kebele: 'Kebele 08'
    });

    // 8. reviewer@oromia.gov.et
    await ensureUserExists({
      email: 'reviewer@oromia.gov.et',
      password_hash: reviewerPassword,
      full_name: 'Kassahun Bekele',
      role: 'officer',
      employee_id: 'EMP-OFFICER-02',
      department_id: envDept.id,
      gender: 'Male',
      phone: '+251900000007',
      region: 'Oromia',
      city: 'Asella',
      woreda: 'Woreda 04',
      kebele: 'Kebele 05'
    });

    // 9. citizen@example.com
    await ensureUserExists({
      email: 'citizen@example.com',
      password_hash: citizenPassword,
      full_name: 'Oromia Citizen User',
      role: 'citizen',
      gender: 'Male',
      phone: '+251911112233',
      region: 'Oromia',
      city: 'Ambo',
      woreda: 'Woreda 02',
      kebele: 'Kebele 01'
    });

    console.log('Seeder process successfully finalized.');
  } catch (error) {
    console.error('Seeding database failed:', error);
  }
};

// Initiate server launch if run directly
if (require.main === module) {
  startServer();
}

module.exports = app; // Export for automated unit test suites
