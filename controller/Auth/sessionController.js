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

    // If JWT doesn't have sessionId or DB doesn't have one yet, treat as invalid.
    // This makes the single-session enforcement deterministic.
    if (!sessionId || !dbUser.activeSessionId || sessionId !== dbUser.activeSessionId) {
      return res.status(401).json({ message: 'Session expired' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { checkActiveSession };

