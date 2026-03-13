const User = require('../../models/Auth/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loginSchema } = require('../../services/validation_schema');
const cache = require('../../middleware/cache');
const { sendOtpEmail } = require('../../services/emailService');
const { generateOtp } = require('../../services/otpService');

const login = async (req, res) => {
  try {
    const { error, email, password } = await loginSchema.validateAsync(req.body);
    console.log('Login attempt for email:', email);

    let user = cache.getCachedModel(email);

    if (!user) {
      user = await User.findOne({ email }).lean();
      cache.setCachedModel(email, user || { email, exists: false });
    }
    if (!user || user.exists === false) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Temp account check
    if (user.isTemp && (!user.tempExpiry || new Date() > user.tempExpiry)) {
      return res.status(410).json({ error: 'Account expired. Please register again.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!['student', 'admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied for this role' });
    }


    const cooldownKey = `otp_cooldown:${email}`;
    const cooldownRemaining = cache.getCacheTtl(cooldownKey);
    console.log(`Cooldown remaining for ${email}:`, cooldownRemaining);
    if (cooldownRemaining && cooldownRemaining > 0) {
      return res.status(429).json({ 
        error: `OTP on cooldown. Try again in ${Math.ceil(cooldownRemaining / 1000)} seconds` 
      });
    }

    const otp = generateOtp();
    const otpKey = `otp:${email}`;
    cache.userCache.set(otpKey, otp, 120); // 2 minutes
    cache.userCache.set(cooldownKey, true, 120); // cooldown

    console.log(`OTP ${otp} sent for ${email}`);

    await sendOtpEmail(email, otp, user.name);

    res.status(200).json({ 
      message: 'OTP sent to your email. Valid for 2 minutes.',
      email 
    });


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = login;
