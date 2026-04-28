const Notification = require("../../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const notifications = await Notification.find()
      .populate('readBy')
      .sort({ createdAt: -1 })
      .limit(50);

    const userIdStr = userId ? userId.toString() : null;

    let notificationList = notifications.map(n => ({
      _id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      target: n.target,
      sentCount: n.sentCount,
      createdAt: n.createdAt,
      date: new Date(n.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      isRead: userIdStr && n.readBy.some(r => r._id.toString() === userIdStr)
    }));

    // Sort unread first, then recent
    notificationList.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ notifications: notificationList });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getNotifications };
