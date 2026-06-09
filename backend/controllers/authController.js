const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Department, Op } = require('../models/models');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { logEvent } = require('../utils/auditLogger');

// Register a new citizen
const registerCitizen = async (req, res) => {
  try {
    const { email, password, fullName, gender, phone, region, city, woreda, kebele } = req.body;

    if (!email || !password || !fullName || !gender || !phone || !region || !city || !woreda || !kebele) {
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    }

    // 1. Password complexity check
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // 2. Duplicate checks
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { phone }] 
      } 
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address or phone number is already registered.' });
    }

    // 3. Password hashing
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. Create user
    const newUser = await User.create({
      email,
      password_hash,
      full_name: fullName,
      role: 'citizen',
      gender,
      phone,
      region,
      city,
      woreda,
      kebele,
      status: 'active'
    });

    // Write audit log
    await logEvent({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      details: `New citizen registration successfully completed: ${fullName} (${email})`
    }, req);

    return res.status(201).json({
      success: true,
      message: 'Citizen registered successfully. Account verification email sent.',
      userId: newUser.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred during registration.' });
  }
};

// Login user (Citizen, Staff, Officer, Department Head, Administrator)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // 1. Fetch user profile
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // 2. Check if account is locked
    const now = new Date();
    if (user.status === 'locked') {
      if (user.locked_until && user.locked_until > now) {
        const remainingMinutes = Math.ceil((user.locked_until - now) / 60000);
        return res.status(403).json({ 
          success: false, 
          message: `Account is temporarily locked due to excessive failed attempts. Please retry in ${remainingMinutes} minutes.` 
        });
      } else {
        // Unlock expired lock
        user.status = 'active';
        user.failed_attempts = 0;
        user.locked_until = null;
        await user.save();
      }
    }

    // 3. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Increment failed attempts safely
      user.failed_attempts = (Number(user.failed_attempts) || 0) + 1;
      
      let details = `Failed login attempt ${user.failed_attempts} for email: ${email}`;

      if (user.failed_attempts >= 5) {
        user.status = 'locked';
        user.locked_until = new Date(now.getTime() + 15 * 60 * 1000); // Lock for 15 minutes
        details += ` - Account status shifted to LOCKED until ${user.locked_until.toISOString()}`;
      }

      await user.save();

      await logEvent({
        userId: user.id,
        action: user.status === 'locked' ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        details
      }, req);

      const attemptsRemaining = Math.max(0, 5 - user.failed_attempts);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.',
        attemptsRemaining 
      });
    }

    // 4. Reset login failures on successful login
    if (user.failed_attempts && user.failed_attempts > 0) {
      user.failed_attempts = 0;
      user.locked_until = null;
      await user.save();
    }

    // 5. Sign JSON Web Token (JWT)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        departmentId: user.department_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logEvent({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: `User logged in successfully. Role: ${user.role}`
    }, req);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        departmentId: user.department_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred during login.' });
  }
};

// Retrieve currently logged-in user profile details
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'failed_attempts', 'locked_until'] },
      include: [{
        model: Department,
        as: 'Department',
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

module.exports = {
  registerCitizen,
  login,
  getProfile
};
