const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { getNotifications } = require('../../controller/Notification/getNotificationsController');
const { createNotification } = require('../../controller/Notification/createNotificationController');
const { deleteNotification } = require('../../controller/Notification/deleteNotificationController');
const { sendNotification } = require('../../controller/Notification/sendNotificationController');
const { markAsRead } = require('../../controller/Notification/markAsReadController');
const { markAllRead } = require('../../controller/Notification/markAllReadController');
const { getUnreadCount } = require('../../controller/Notification/getUnreadCountController');


router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.post('/', protect, createNotification);
router.patch('/:id/read', protect, markAsRead);
router.patch('/mark-all-read', protect, markAllRead);
router.delete('/:id', protect, deleteNotification);
router.post('/:id/send', protect, sendNotification);

module.exports = router;
