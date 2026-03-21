const User = require('../../models/Auth/User');
const jwt = require('jsonwebtoken');
const cache = require('../../middleware/cache');
const { verifyOtpSchema } = require('../../services/validation_schema');
const { isValidOtp } = require('../../services/otpService');

const verifyOtp = async (req, res) => {
  try {
    const { error, email, otp } = await verifyOtpSchema.validateAsync(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!isValidOtp(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    // Check OTP from cache
    const cachedOtp = cache.userCache.get(`otp:${email}`);
    if (!cachedOtp || cachedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Fetch user
    let user = cache.getCachedModel(email);
    if (!user) {
      user = await User.findOne({ email }).lean();
      cache.setCachedModel(email, user);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Activate temp user if needed
    if (user.isTemp) {
      await User.findByIdAndUpdate(user._id, {
        isTemp: false,
        status: 'active',
        $unset: { tempExpiry: 1 }
      });
      // Refresh user from DB
      user = await User.findOne({ email }).lean();
      cache.setCachedModel(email, user);
    }

    // Clear OTP and cooldown
    cache.delCache(`otp:${email}`);
    cache.delCache(`otp_cooldown:${email}`);

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      enrollment: user.enrollment
    };
    
    cache.setCachedUser(user._id, safeUser);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Login successful',
      user: safeUser
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = verifyOtp;

