const Notification = require("../../models/Notification");
const mongoose = require("mongoose");

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const rawUserId = req.user.userId || req.user._id;
    if (!rawUserId) {
      return res.status(401).json({ error: 'User ID missing' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    // Clean stale nulls first, then add user (can't $pull and $addToSet same field in one update)
    await Notification.findByIdAndUpdate(id, { $pull: { readBy: null } });
    await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: userId } });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { markAsRead };

