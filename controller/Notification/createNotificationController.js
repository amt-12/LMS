const Notification = require("../../models/Notification");
const mongoose = require('mongoose');

const createNotification = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { title, message, type, target: rawTarget } = req.body;

    let processedTarget = rawTarget || 'all';

    if (processedTarget !== 'all') {
      // Validate if rawTarget is valid ObjectId and prefix with 'course_'
      if (!mongoose.Types.ObjectId.isValid(rawTarget)) {
        return res.status(400).json({ error: `Invalid target: '${rawTarget}'. Must be 'all' or valid course ObjectId.` });
      }
      processedTarget = `course_${rawTarget}`;
    }

    const notification = new Notification({
      title,
      message,
      type: type || 'announcement',
      target: processedTarget
    });

    await notification.save();

    if (global.io) {
      global.io.emit('newNotification', {
        _id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt.toISOString()
      });
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target: notification.target,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createNotification };
