const User = require('../../models/Auth/User');

// Called periodically from the app to immediately detect logout-on-other-device.
// If this device's JWT sessionId is no longer active => return 401.
const checkActiveSession = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const sessionId = req.user?.sessionId;

    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const dbUser = await User.findById(userId).select('activeSessionId').lean();

    if (!dbUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Single-device session enforcement has been disabled.
    // Keep heartbeat as a simple auth check so the app doesn't log out
    // when the user logs in on another device.
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { checkActiveSession };

