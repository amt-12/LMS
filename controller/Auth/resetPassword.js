const bcrypt = require('bcryptjs');
const User = require('../../models/Auth/User');
const cache = require('../../middleware/cache');
const { resetPasswordSchema } = require('../../services/validation_schema');

const resetPassword = async (req, res) => {
  try {
    const result = await resetPasswordSchema.validateAsync(req.body);
    const { email, resetCode, newPassword } = result;

    const resetKey = `reset:${email}`;
    const storedCode = cache.userCache.get(resetKey);

    if (!storedCode || storedCode !== resetCode) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    cache.userCache.del(resetKey);
    cache.invalidateUserCache(user._id.toString());

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.isJoi) {
      return res.status(400).json({ error: error.details[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = resetPassword;

