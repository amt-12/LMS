const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  liveClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveClass',
    required: true
  },
  reminderTime: {
    type: Date,
    required: true,
    index: true
  },
  sent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient cron queries
reminderSchema.index({ liveClassId: 1, reminderTime: 1 });
reminderSchema.index({ studentId: 1, sent: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);

