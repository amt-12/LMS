const express = require("express");
const { loginLimiter } = require("../../middleware/rateLimit");
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();
const register = require("../../controller/Auth/register");
const login = require("../../controller/Auth/login");
const verifyOtp = require("../../controller/Auth/verifyOtp");
const adminLogin = require("../../controller/Auth/adminLogin");
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
router.post("/admin-login", adminLogin);

// Profile routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);
router.put("/profile/image", protect, upload.single('image'), uploadProfileImage);

module.exports = router;
