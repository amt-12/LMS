// controller/Auth/logout.js
// Clears authentication cookie and responds with success.

const logout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    // Optionally, you could invalidate the session on the server side by clearing activeSessionId,
    // but we keep it to allow other devices to stay logged in. If you want to force logout on all devices,
    // uncomment the lines below:
    // const User = require('../models/Auth/User');
    // await User.findByIdAndUpdate(req.user.userId, { activeSessionId: null });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = logout;
