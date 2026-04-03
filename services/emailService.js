const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || 'amrit0207232@gmail.com', // Add to .env
    pass: process.env.SMTP_PASS || 'jjohknqntwuhzqye'   // Gmail App Password
  }
});

// Function to compile template with data
function compileTemplate(templatePath, data = {}) {
  let template = fs.readFileSync(path.join(__dirname, '../templates/email-template.html'), 'utf8');
  
  // Replace placeholders
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, data[key] || '');
  });
  
  return template;
}

// Send generic email
async function sendEmail(to, subject, data = {}) {
  try {
    const html = compileTemplate(null, data);
    
    await transporter.sendMail({
      from: `"Legal Compass LMS" <${process.env.SMTP_EMAIL || 'noreply@lms.com'}>`,
      to,
      subject,
      html
    });
    
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    // Don't throw - fire and forget
  }
}

// Welcome email wrapper (for register/login)
async function sendWelcomeEmail(to, name, action = 'Welcome') {
  const subject = action === 'Register' ? 'Welcome to Legal Compass LMS!' : 'Welcome Back to LMS!';
  const message = action === 'Register' 
    ? 'We will connect you shortly, before that enjoy demo class. Watch this: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Demo Legal Class</a>'
    : 'Welcome back! Thank you for logging into Legal Compass LMS. Continue your legal education with our comprehensive courses.';
  
  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

// Student welcome email
async function sendStudentWelcomeEmail(to, name, tempPassword, appLink, dashboardLink) {
  const subject = 'Welcome to Abhishek\'s Academy LMS!';
  const message = `
    <p>Congratulations! Your account has been created by admin.</p>
    <h3>Your Temporary Login Details:</h3>
    <p><strong>Email:</strong> ${to}</p>
    <p><strong>Password:</strong> <span style="font-size:18px; color:#13294B;">${tempPassword}</span> (Change after login)</p>
    <br>
    <h3 style="color:#13294B;">Get Started:</h3>
    <p>• <a href="${appLink}" style="color:#e6c17a;">📱 Download Our Mobile App</a></p>
    <p>• <a href="${dashboardLink}" style="color:#e6c17a;">🌐 Access Website Dashboard</a></p>
    <p>Start your learning journey with our premium legal courses!</p>
  `;
  
  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

// OTP email
async function sendOtpEmail(to, otp, name) {
  await sendEmail(to, 'Legal Compass LMS - Your OTP Code', {
    name,
    subject: 'Your OTP Code',
    message: `
      <h3 style="color:#13294B;">Your One-Time Password (OTP)</h3>
      <p>Your OTP is: <strong style="font-size:24px; color:#13294B;">${otp}</strong></p>
      <p>This OTP is valid for <strong>2 minutes</strong>. Do not share it with anyone.</p>
      <p>If you did not request this OTP, please ignore this email.</p>
    `
  });
}

// Enrollment email
async function sendEnrollmentEmail(to, name, courseName) {
  const subject = 'Congratulations! You are officially enrolled!';
  const message = `
    <h3 style="color:#13294B;">Welcome to ${courseName || 'your course'}!</h3>
    <p>Dear ${name},</p>
    <p>We are thrilled to inform you that your enrollment has been activated by the admin.</p>
    <p>You now have full access to all your course materials, live classes, and recorded lectures.</p>
    <p>Log in to your mobile app to get started on your legal education journey!</p>
  `;
  
  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

// Live class start notification email
async function sendLiveClassStartEmail(to, name, { title, joinUrl, password, startTime }) {
  const subject = `🔴 Live Class Started: ${title}`;
  const formattedTime = startTime
    ? new Date(startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : 'Now';

  const message = `
    <h3 style="color:#13294B;">Your Live Class Has Just Started! 🎓</h3>
    <p>Dear ${name},</p>
    <p>Your instructor has started the live class. Join now so you don't miss anything!</p>
    <table style="border-collapse:collapse; width:100%; margin:16px 0;">
      <tr>
        <td style="padding:8px; font-weight:bold; color:#13294B;">Class Title</td>
        <td style="padding:8px;">${title}</td>
      </tr>
      <tr style="background:#f9f6ef;">
        <td style="padding:8px; font-weight:bold; color:#13294B;">Started At</td>
        <td style="padding:8px;">${formattedTime}</td>
      </tr>
      <tr>
        <td style="padding:8px; font-weight:bold; color:#13294B;">Meeting Password</td>
        <td style="padding:8px;"><strong style="font-size:18px; color:#13294B;">${password}</strong></td>
      </tr>
    </table>
    <p style="text-align:center; margin:24px 0;">
      <a href="${joinUrl}" style="background:#13294B; color:#e6c17a; padding:12px 28px; border-radius:6px; text-decoration:none; font-size:16px; font-weight:bold;">
        ▶ Join Live Class Now
      </a>
    </p>
    <p style="color:#888; font-size:13px;">You are receiving this because you are enrolled in this course. Open the mobile app or click the button above to join.</p>
  `;

  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

module.exports = { sendEmail, sendWelcomeEmail, sendOtpEmail, sendStudentWelcomeEmail, sendEnrollmentEmail, sendLiveClassStartEmail };

