const Notification = require("../../models/Notification");
const mongoose = require('mongoose');

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const unread = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $addFields: {
          isReadByUser: { $in: [new mongoose.Types.ObjectId(userId), '$readBy'] }
        }
      },
      {
        $match: {
          isReadByUser: false
        }
      },
      {
        $count: 'unreadCount'
      }
    ]);

    const unreadCount = unread[0]?.unreadCount || 0;
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getUnreadCount };

