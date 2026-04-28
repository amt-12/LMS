const Notification = require("../../models/Notification");
const mongoose = require("mongoose");

const markAllRead = async (req, res) => {
  try {
    const rawUserId = req.user.userId || req.user._id;
    if (!rawUserId) {
      return res.status(401).json({ error: 'User ID missing' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    // Clean stale nulls first, then add user (can't $pull and $addToSet same field in one update)
    await Notification.updateMany({}, { $pull: { readBy: null } });
    const result = await Notification.updateMany({}, { $addToSet: { readBy: userId } });

    res.json({ message: `${result.modifiedCount} notifications marked as read`, updated: result.modifiedCount });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { markAllRead };
