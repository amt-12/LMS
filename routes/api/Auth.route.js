const express = require("express");
const { loginLimiter } = require("../../middleware/rateLimit");

const router = express.Router();
const register = require("../../controller/Auth/register");
const login = require("../../controller/Auth/login");
const verifyOtp = require("../../controller/Auth/verifyOtp");

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", loginLimiter, verifyOtp);

module.exports = router;
