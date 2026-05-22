const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const REGION = 'ap-south-1';
const FROM_EMAIL = 'no-reply@abhishekjudicialacademy.in';
const TEST_EMAIL = 'no-reply@abhishekjudicialacademy.in';

console.log(`Initializing AWS SES client | Env: ${process.env.NODE_ENV || 'development'} | Region: ${REGION} | From: ${FROM_EMAIL}`);



const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  }
});


function compileTemplate(templatePath, data = {}) {
  try {
    let template = fs.readFileSync(path.join(__dirname, '../templates/email-template.html'), 'utf8');
    console.log('Email template loaded successfully');

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, data[key] || '');
    });

    return template;
  } catch (err) {
    console.error('Failed to load email template:', err.message);
    return `<h1>Email Service</h1><p>${data.message || 'No message'}</p><p>Sent to {{name}}</p>`;
  }
}

async function sendEmail(to, subject, data = {}) {
  console.log(`🔄 Attempting to send email to: ${to}, subject: ${subject}`);
  console.log('SES From:', FROM_EMAIL, '| Sandbox:', !isProduction);

  try {
    const html = compileTemplate(null, data);

    const params = {
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: FROM_EMAIL,
      ...(isProduction || {
        ConfigurationSetName: undefined, // Optional
      }),
    };

    // Sandbox mode for dev
    if (!isProduction) {
      params.Destination.CcAddresses = [TEST_EMAIL];
      console.log(`🧪 Sandbox mode: CC to test email ${TEST_EMAIL}`);
    }

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);

    console.log(`✅ Email sent successfully to ${to} | MessageId: ${result.MessageId} | Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error(`❌ SES Email FAILED to ${to}:`, error.message);
    if (error.name) console.error('Error name:', error.name);
    if (error.$metadata) console.error('HTTP Status:', error.$metadata.httpStatusCode);
    throw error;
  }
}

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

// Other functions (unchanged, call sendEmail)
async function sendWelcomeEmail(to, name, action = 'Welcome') {
  const subject = action === 'Register' ? "Welcome to Abhishek's Judicial Academy!" : 'Welcome Back to LMS!';
  const message = action === 'Register'
    ? 'We will connect you shortly, before that enjoy demo class. Watch this: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Demo Legal Class</a>'
    : "Welcome back! Thank you for logging into Abhishek's Judicial Academy.";

  await sendEmail(to, subject, { name, subject, message });
}

async function sendStudentWelcomeEmail(to, name, tempPassword, appLink, dashboardLink) {
  const subject = "Welcome to Abhishek's Academy LMS!";
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

  await sendEmail(to, subject, { name, subject, message });
}

async function sendEnrollmentEmail(to, name, courseName) {
  const subject = 'Congratulations! You are officially enrolled!';
  const message = `
    <h3 style="color:#13294B;">Welcome to ${courseName || 'your course'}!</h3>
    <p>Dear ${name}, your enrollment has been activated.</p>
  `;

  await sendEmail(to, subject, { name, subject, message });
}

async function sendUnenrollmentEmail(to, name, courseName) {
  const subject = 'Notice: Your enrollment has been updated';
  const message = `
    <h3 style="color:#d32f2f;">Enrollment Status Update</h3>
    <p>Dear ${name}, your enrollment for ${courseName || 'your course(s)'} has been updated.</p>
  `;

  await sendEmail(to, subject, { name, subject, message });
}

async function sendLiveClassStartEmail(to, name, { title, joinUrl, password, startTime }) {
  const subject = `🔴 Live Class Started: ${title}`;
  const message = `
    <h3 style="color:#13294B;">Live class "${title}" has started!</h3>

  `;

  await sendEmail(to, subject, { name, subject, message });
}

// Startup verification
setImmediate(async () => {
  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [TEST_EMAIL] }, // Dummy
      Message: { Subject: { Data: 'Test', Charset: 'UTF-8' }, Body: { Text: { Data: 'Test SES connection', Charset: 'UTF-8' } } }
    });
    await sesClient.send(command);
    console.log('✅ SES client READY');
  } catch (err) {
    console.error('🚨 SES client verification FAILED (normal in sandbox if unverified):', err.message);
  }
});

async function sendPasswordResetEmail(to, code, name) {
  const subject = "Abhishek's Judicial Academy - Password Reset Code";
  const message = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color:#13294B;">Password Reset Request</h2>
      <p style="font-size: 16px; color: #333;">You requested to reset your password.</p>
      <div style="font-size: 48px; font-weight: bold; color: #13294B; letter-spacing: 8px; margin: 20px 0; background: #f9f6ef; padding: 20px; border-radius: 10px;">
        ${code}
      </div>
      <p>This reset code is valid for <strong>10 minutes</strong>.</p>
      <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email or contact support.</p>
    </div>
  `;

  await sendEmail(to, subject, { name, subject, message });
}

module.exports = { sendEmail, sendWelcomeEmail, sendOtpEmail, sendStudentWelcomeEmail, sendEnrollmentEmail, sendUnenrollmentEmail, sendLiveClassStartEmail, sendPasswordResetEmail };

