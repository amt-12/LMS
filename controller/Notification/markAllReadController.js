const Notification = require("../../models/Notification");

const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      {},
      { $addToSet: { readBy: userId } }
    );

    res.json({ message: `${result.modifiedCount} notifications marked as read`, updated: result.modifiedCount });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { markAllRead };

