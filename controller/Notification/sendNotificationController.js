const Notification = require("../../models/Notification");
const mongoose = require('mongoose');
const { sendBulkNotification } = require("../../services/notificationService");
const User = require("../../models/Auth/User");

const sendNotification = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Get target students
    let students = [];
    if (notification.target === 'all') {
      students = await User.find({ 
        role: 'student',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      }).select('name email enrolledCourses').lean();
    } else {
      // Extract courseId from 'course_<id>' format
      const courseId = notification.target.replace(/^course_/, '');
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: `Invalid course ID in notification target: ${notification.target}` });
      }
      students = await User.find({ 
        role: 'student',
        enrolledCourses: courseId,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      }).select('name email enrolledCourses').lean();
    }

    const sentCount = students.length;
     sendBulkNotification(notification, students);

    // Update notification
    notification.sentCount = sentCount;
    notification.sentAt = new Date();
    await notification.save();

    res.json({
      message: `Notification sent to ${sentCount} students`,
      notification: {
        _id: notification._id,
        title: notification.title,
        sentCount,
        sentAt: notification.sentAt
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Server error sending notification' });
  }
};

module.exports = { sendNotification };
