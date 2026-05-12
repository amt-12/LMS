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
  // Stable per-app-session/device session id
  deviceSessionId: {
    type: String,
    required: true,
    index: true
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

// One active join per student+class is handled by controller logic.
studentLiveClassJoinSchema.index({ studentId: 1, liveClassId: 1 });

// Heartbeat lookup
studentLiveClassJoinSchema.index({ studentId: 1, liveClassId: 1, deviceSessionId: 1 });

module.exports = mongoose.model('StudentLiveClassJoin', studentLiveClassJoinSchema);

