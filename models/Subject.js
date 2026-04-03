const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subject title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  }
}, {
  timestamps: true
});

// Ensure unique subjects per course (optional)
subjectSchema.index({ courseId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);

