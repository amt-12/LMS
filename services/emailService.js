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

module.exports = { sendEmail, sendWelcomeEmail, sendOtpEmail, sendStudentWelcomeEmail };

