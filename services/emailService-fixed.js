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
  try {
    let template = fs.readFileSync(path.join(__dirname, '../templates/email-template.html'), 'utf8');
    
    // Replace placeholders
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, data[key] || '');
    });
    
    return template;
  } catch (err) {
    console.error('Failed to load email template:', err.message);
    return `<h1>Email Service</h1><p>{{message}}</p><p>Sent to {{name}}</p>`;
  }
}

// Send generic email
async function sendEmail(to, subject, data = {}) {
  
  try {
    // Verify transporter
    await transporter.verify().catch(err => {
      throw new Error(`Transporter not ready: ${err.message}`);
    });
    
    const html = compileTemplate(null, data);

    const mailOptions = {
      from: `"Abhishek's Judicial Academy" <${process.env.SMTP_EMAIL || 'amrit0207232@gmail.com'}>`,
      to,
      cc: 'Abhishekmanikumar@gmail.com',
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`❌ Email FAILED to ${to}:`, error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.response) console.error('Response:', error.response);
    throw error;  // Throw to surface issues in dev
  }
}

// OTP email - now with better logging and error handling
async function sendOtpEmail(to, otp, name) {
  
  try {
    await sendEmail(to, "Abhishek's Judicial Academy - Your OTP Code", {
      name,
      subject: 'Your OTP Code',
      message: `
        <div style="text-align: center; padding: 20px;">
          <h2 style="color:#13294B;">Your One-Time Password (OTP)</h2>
          <div style="font-size: 48px; font-weight: bold; color: #13294B; letter-spacing: 8px; margin: 20px 0; background: #f9f6ef; padding: 20px; border-radius: 10px;">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>2 minutes</strong>.</p>
          <p style="font-size: 14px; color: #666;">Do not share it with anyone. If you did not request this, ignore this email.</p>
        </div>
      `
    });
  } catch (err) {
    console.error(`💥 OTP email failed for ${to}:`, err.message);
    throw err;
  }
}

// Keep other functions for compatibility
async function sendWelcomeEmail(to, name, action = 'Welcome') {
  const subject = action === 'Register' ? "Welcome to Abhishek's Judicial Academy!" : 'Welcome Back to LMS!';
  const message = action === 'Register'
    ? 'We will connect you shortly, before that enjoy demo class. Watch this: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Demo Legal Class</a>'
    : "Welcome back! Thank you for logging into Abhishek's Judicial Academy.Continue your legal education with our comprehensive courses.";

  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

async function sendStudentWelcomeEmail(to, name, tempPassword, appLink, dashboardLink) {
  const subject = \"Welcome to Abhishek's Academy LMS!\";
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

async function sendUnenrollmentEmail(to, name, courseName) {
  const subject = 'Notice: Your enrollment has been updated';
  const message = `
    <h3 style="color:#d32f2f;">Enrollment Status Update</h3>
    <p>Dear ${name},</p>
    <p>This is to inform you that your enrollment status for ${courseName || 'your course(s)'} has been updated to inactive by the admin.</p>
    <p>You will no longer have access to course materials, live classes, and recorded lectures until reactivation.</p>
    <p>If you have any questions or need assistance, please contact your course administrator.</p>
    <p>Thank you for your understanding.</p>
    <p>Best regards,<br>Abhishek's Academy LMS Team</p>
  `;

  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

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

// Auto-verify transporter
setImmediate(() => {
  transporter.verify((err, success) => {
    if (err) {
      console.error('🚨 Email transporter FAILED verification:', err.message);
    } else {
      console.log('✅ Email transporter READY');
    }
  });
});

module.exports = { sendEmail, sendWelcomeEmail, sendOtpEmail, sendStudentWelcomeEmail, sendEnrollmentEmail, sendUnenrollmentEmail, sendLiveClassStartEmail };
