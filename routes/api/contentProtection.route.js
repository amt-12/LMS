const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  reportViolation,
  getProtectionStatus,
  unblockStudent,
} = require('../../controller/contentProtectionController');

// Student endpoints
router.post('/violation', protect, reportViolation);
router.get('/status', protect, getProtectionStatus);

// Admin endpoint
router.put('/unblock/:id', protect, unblockStudent);

module.exports = router;
