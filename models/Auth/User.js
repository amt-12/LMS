const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      index: true
    },
    password: String,
    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student"
    },
    isTemp: {
      type: Boolean,
      default: true
    },
    tempExpiry: {
      type: Date,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
