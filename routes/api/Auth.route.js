const express = require("express");
const { loginLimiter } = require("../../middleware/rateLimit");
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();
const register = require("../../controller/Auth/register");
const login = require("../../controller/Auth/login");
const verifyOtp = require("../../controller/Auth/verifyOtp");
const resendOtp = require("../../controller/Auth/resendOtp");
const adminLogin = require("../../controller/Auth/adminLogin");
const logout = require("../../controller/Auth/logout");
const forgotPassword = require("../../controller/Auth/forgotPassword");
const resetPassword = require("../../controller/Auth/resetPassword");
const { getProfile, updateProfile, deleteProfile, uploadProfileImage } = require("../../controller/Auth/profile");
const { protect } = require("../../middleware/authMiddleware");

// Multer config for profile image (single image, 5MB limit)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", loginLimiter, verifyOtp);
router.post("/resend-otp", loginLimiter, resendOtp);
router.post("/admin-login", adminLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Profile routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);
router.put("/profile/image", protect, upload.single('image'), uploadProfileImage);

router.post("/logout", protect, logout);
module.exports = router;
