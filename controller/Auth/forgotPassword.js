const User = require('../../models/Auth/User');
const cache = require('../../middleware/cache');
const { generateOtp } = require('../../services/otpService');
const { sendPasswordResetEmail } = require('../../services/emailService');
const { forgotPasswordSchema } = require('../../services/validation_schema');

const forgotPassword = async (req, res) => {
  try {
    const result = await forgotPasswordSchema.validateAsync(req.body);
    const { email } = result;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const resetCode = generateOtp();
    const resetKey = `reset:${email}`;
    const cooldownKey = `reset_cooldown:${email}`;

    if (cache.userCache.get(cooldownKey)) {
      return res.status(429).json({
        error: 'Reset code recently sent. Please wait before requesting again.'
      });
    }

    cache.userCache.set(resetKey, resetCode, 600); // 10 minutes
    cache.userCache.set(cooldownKey, true, 120);   // 2 minute cooldown

    await sendPasswordResetEmail(email, resetCode, user.name);

    res.status(200).json({
      message: 'Password reset code sent to your email. Valid for 10 minutes.',
      email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error.isJoi) {
      return res.status(400).json({ error: error.details[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = forgotPassword;

