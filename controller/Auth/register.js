const User = require("../../models/Auth/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { registerSchema } = require("../../services/validation_schema");
const cache = require("../../middleware/cache");
const { sendWelcomeEmail } = require("../../services/emailService");

const register = async (req, res) => {
  try {
    const { error, name, email, password } = await registerSchema.validateAsync(
      req.body
    );
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userVerify = await User.findOne({ email }).lean().select('email');
    if (userVerify) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isTemp: true,
      tempExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    sendWelcomeEmail(user.email, user.name, "Register");

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

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
