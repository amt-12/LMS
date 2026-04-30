const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const LiveClass = require('../models/LiveClass');
const { sendEmail } = require('./emailService');

let cronJob = null;

const startReminderCron = () => {
  // Run every minute: check for due reminders
  cronJob = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find unsent reminders due now (±1min tolerance)
      const dueReminders = await Reminder.find({
        reminderTime: { $lte: new Date(now.getTime() + 60 * 1000) }, // +1min
        sent: false
      }).populate('studentId', 'email name').populate('liveClassId', 'title subject joinUrl password startTime');

      for (const reminder of dueReminders) {
        const { studentId, liveClassId } = reminder;
        const classTitle = liveClassId.title;
        const startTime = new Date(liveClassId.startTime).toLocaleString();
        const joinUrl = liveClassId.joinUrl;
        const password = liveClassId.password;

        // Send email
        await sendEmail(
          studentId.email,
          `🔔 Live Class Reminder: ${classTitle} starts in 10 minutes!`,
          {
            name: studentId.name,
            subject: 'Live Class Reminder - 10 Minutes Left!',
            message: `
              <h2>⏰ Your class is starting in 10 minutes!</h2>
              <p><strong>${classTitle}</strong></p>
              <p>📅 <strong>Starts:</strong> ${startTime}</p>
              <p>👉 <strong>Join Now:</strong></p>
              <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:15px 0;">
                <p><strong>Zoom Link:</strong> <a href="${joinUrl}" style="color:#2563eb;">${joinUrl}</a></p>
                <p><strong>Meeting ID:</strong> ${liveClassId.zoomMeetingId}</p>
                <p><strong>Passcode:</strong> ${password}</p>
              </div>
              <p>Don't miss this interactive session!</p>
              <p>Best,<br>Abhishek's Academy Team</p>
            `
          }
        );

        // Mark as sent
        reminder.sent = true;
        await reminder.save();

      }

    } catch (error) {
      console.error('Reminder cron error:', error);
    }
  });

};

const stopReminderCron = () => {
  if (cronJob) {
    cronJob.stop();
  }
};

module.exports = { startReminderCron, stopReminderCron };

