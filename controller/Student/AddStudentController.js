const bcrypt = require("bcryptjs");
const User = require("../../models/Auth/User");
const { sendStudentWelcomeEmail } = require("../../services/emailService");

const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const addStudent = async (req, res) => {
  try {
    const { name, email, phone, address, status } = req.body;
    
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      role: 'student',
      isTemp: status === 'Inactive',
      tempExpiry: status === 'Inactive' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    });

    // Send welcome email
    const appLink = 'https://play.google.com/store/apps/details?id=com.abhisheksacademy.lmsapp';
    const dashboardLink = 'http://localhost:8080/login';
    sendStudentWelcomeEmail(email, name, tempPassword, appLink, dashboardLink);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      status: status || 'Active',
      createdAt: user.createdAt,
    };

    res.status(201).json({
      message: 'Student added successfully',
      student: safeUser,
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { addStudent };

