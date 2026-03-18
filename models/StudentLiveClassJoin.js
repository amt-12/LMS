const mongoose = require('mongoose');

const studentLiveClassJoinSchema = new mongoose.Schema({
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
  deviceType: {
    type: String,
    enum: ['web', 'mobile'],
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for quick lookup
studentLiveClassJoinSchema.index({ studentId: 1, liveClassId: 1 }, { unique: true });

module.exports = mongoose.model('StudentLiveClassJoin', studentLiveClassJoinSchema);

