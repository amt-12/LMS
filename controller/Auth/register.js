const User = require("../../models/Auth/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { registerSchema } = require("../../services/validation_schema");
const cache = require("../../middleware/cache");
const { sendOtpEmail } = require("../../services/emailService");
const { generateOtp } = require("../../services/otpService");

const register = async (req, res) => {
  try {
    const { name, email, phone, course, password } = await registerSchema.validateAsync(
      req.body
    );
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If user is already verified (isTemp=false), block registration
      if (!existingUser.isTemp) {
        return res.status(400).json({ error: "Email already registered, please login" });
      }

      // User is still temp+inactive — update their info and resend OTP
      existingUser.name = name;
      existingUser.phone = phone || '';
      existingUser.course = course || '';
      existingUser.password = hashedPassword;
      existingUser.tempExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await existingUser.save();

      const otp = generateOtp();
      cache.userCache.set(`otp:${email}`, otp, 120); // 2 min TTL
      sendOtpEmail(existingUser.email, otp, existingUser.name);

      return res.status(200).json({
        message: "OTP resent to your email",
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone, isTemp: false }).lean().select('phone');
      if (phoneExists) {
        return res.status(400).json({ error: "Phone number already registered" });
      }
    }

    const user = await User.create({
      name,
      email,
      phone: phone || '',
      course: course || '',
      password: hashedPassword,
      isTemp: true,
      tempExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Generate 6-digit OTP, cache for 2 minutes, and send via email
    const otp = generateOtp();
    cache.userCache.set(`otp:${email}`, otp, 120); // 2 min TTL
    sendOtpEmail(user.email, otp, user.name);

    res.status(201).json({
      message: "Registration successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = register;
