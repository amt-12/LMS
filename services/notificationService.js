const { sendEmail } = require('./emailService');
const User = require('../models/Auth/User');

async function sendBulkNotification(notification, students) {
  const emailsSent = [];
  
  for (const student of students) {
    try {
      await sendEmail(
        student.email,
        `📢 ${notification.title}`,
        {
          name: student.name,
          subject: notification.title,
          message: `
            <div style="padding: 20px;">
              <h3 style="color: #13294B;">${notification.title}</h3>
              <p>${notification.message}</p>
              <p><em>Type: ${notification.type.toUpperCase()}</em></p>
              <hr style="border: 1px solid #e6c17a;">
              <p>Best regards,<br>Abhishek's Academy LMS Team</p>
            </div>
          `
        }
      );
      emailsSent.push(student.email);
    } catch (error) {
      console.error(`❌ Failed to send to ${student.email}:`, error.message);
    }
  }
  
}

module.exports = { sendBulkNotification };
