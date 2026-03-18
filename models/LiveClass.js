const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true
  },
  zoomMeetingId: {
    type: String,
    required: true,
    unique: true
  },
  joinUrl: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // minutes
    default: 60
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LiveClass', liveClassSchema);

