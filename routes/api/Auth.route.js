const express = require("express");
const { loginLimiter } = require("../../middleware/rateLimit");

const router = express.Router();
const register = require("../../controller/Auth/register");
const login = require("../../controller/Auth/login");
const verifyOtp = require("../../controller/Auth/verifyOtp");
const adminLogin = require("../../controller/Auth/adminLogin");
const { getProfile, updateProfile, deleteProfile } = require("../../controller/Auth/profile");
const { protect } = require("../../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", loginLimiter, verifyOtp);
router.post("/admin-login", adminLogin);

// Profile routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);

module.exports = router;
