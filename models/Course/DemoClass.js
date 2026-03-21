const mongoose = require('mongoose');

const demoClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Demo class title is required'],
    trim: true,
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL or YouTube link is required']
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemoClass', demoClassSchema);
