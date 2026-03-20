const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'draft'],
    default: 'active'
  },
  imageUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
courseSchema.index({ title: 'text', status: 1 });

module.exports = mongoose.model('Course', courseSchema);

