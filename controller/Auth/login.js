const User = require('../../models/Auth/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loginSchema } = require('../../services/validation_schema');
const cache = require('../../middleware/cache');
const { sendOtpEmail } = require('../../services/emailService');
const { generateOtp } = require('../../services/otpService');

const login = async (req, res) => {
  try {
    console.log('Raw req.body:', req.body);

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await loginSchema.validateAsync(req.body);
    console.log('validateAsync result:', result);
    if (result.error) {
      return res.status(400).json({ error: result.error.details[0].message });
    }
    const validatedData = result.value || result;
    const { email, password } = validatedData;
    console.log('Destructured email/password:', { email, hasPassword: !!password });
    console.log('Login attempt for email:', email);
    console.log('Validated data:', { email, passwordExists: !!password, passwordType: typeof password });

    let user = cache.getCachedModel(email);

    if (!user) {
      user = await User.findOne({ email }).lean().select('email isTemp tempExpiry');
      cache.setCachedModel(email, user || { email, exists: false });
    }
    if (!user || user.exists === false) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Guard against undefined/null password
    if (!password || typeof password !== 'string') {
      console.log('Password validation failed:', { password, type: typeof password });
      return res.status(400).json({ error: 'Password is required and must be a string' });
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
    if (cache.userCache.get(cooldownKey)) {
      return res.status(429).json({ 
        error: 'OTP on cooldown. Try again in 2 minutes.' 
      });
    }

    const otp = generateOtp();
    const otpKey = `otp:${email}`;
    cache.userCache.set(otpKey, otp, 120); // 2 minutes
    cache.userCache.set(cooldownKey, true, 120); // 2 min cooldown

    console.log(`OTP ${otp} sent for ${email}`);

     sendOtpEmail(email, otp, user.name);

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
