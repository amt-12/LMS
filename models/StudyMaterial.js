const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  fileSize: {
    type: Number,
    required: true // bytes
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['application/pdf'] // PDF only for now
  }
}, {
  timestamps: true
});

// Index for performance
studyMaterialSchema.index({ course: 1, createdAt: -1 });
studyMaterialSchema.index({ s3Key: 1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
