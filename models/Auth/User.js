const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student"
    },
    isTemp: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive"
    },
    enrollment: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive"
    },
    phone: {
      type: String,
      default: ''
    },
    course: {
      type: String,
      default: ''
    },
    enrolledCourses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    enrolledSubjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }],
    address: {
      type: String,
      default: ''
    },
    batch: {
      type: String,
      default: ''
    },
    tempExpiry: {
      type: Date
    },
    profileImage: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Explicit compound index for common queries in register/login
userSchema.index({ email: 1, isTemp: 1 });

module.exports = mongoose.model("User", userSchema);

