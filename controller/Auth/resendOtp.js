const User = require("../../models/Auth/User");
const bcrypt = require("bcryptjs");
const cache = require("../../middleware/cache");
const { sendOtpEmail } = require("../../services/emailService");
const { generateOtp } = require("../../services/otpService");
const { resendOtpSchema } = require("../../services/validation_schema");

const resendOtp = async (req, res) => {
  try {
    const { email } = await resendOtpSchema.validateAsync(req.body);

    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    // Update/create temp status
    user.tempExpiry = new Date(Date.now() + 5 * 60 * 1000);
    if (!user.password) {
      // Minimal temp user if no password yet
      user.password = await bcrypt.hash('temp', 10);
    }
    await user.save();

    // Generate and cache new OTP
    const otp = generateOtp();
    cache.userCache.set(`otp:${email}`, otp, 120); // 2 min TTL

    const emailSent = await sendOtpEmail(user.email, otp, user.name || 'User').catch(() => false);

    res.status(200).json({
      message: emailSent ? "OTP resent successfully" : "OTP generated (email service issue)",
      email: user.email
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = resendOtp;

