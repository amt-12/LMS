const mongoose = require('mongoose');
const Reminder = require('../../models/Reminder');
const LiveClass = require('../../models/LiveClass');

const setReminderController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;
const studentId = req.user?.userId;
  
if (!studentId || typeof studentId !== 'string' || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid or missing student authentication' 
    });
  } // from authMiddleware

    // Verify class exists and not completed
    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }
    if (liveClass.status === 'completed') { // Note: uses computed status from getter
      return res.status(400).json({ success: false, message: 'Cannot set reminder for completed class' });
    }

    // Compute reminder time: 10 minutes before start
    const reminderTime = new Date(liveClass.startTime.getTime() - 10 * 60 * 1000);

    // Check if already exists for this student/class
    const existingReminder = await Reminder.findOne({
      studentId,
      liveClassId
    });

    if (existingReminder) {
      return res.status(409).json({ 
        success: false, 
        message: 'Reminder already set for this class' 
      });
    }

    // Create reminder
    const reminder = new Reminder({
      studentId,
      liveClassId,
      reminderTime,
      sent: false
    });

    await reminder.validate();
    await reminder.save();

    res.status(201).json({
      success: true,
      message: 'Reminder set successfully! You will get email 10 minutes before class.',
      data: { reminderTime: reminderTime.toISOString() }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder data: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    console.error('Set reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error setting reminder'
    });
  }
};

module.exports = { setReminderController };

