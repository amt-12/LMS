const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { checkActiveSession } = require('../../controller/Auth/sessionController');

const router = express.Router();

router.post('/heartbeat', protect, checkActiveSession);

// Backward compatible alias for clients that call a shorter path
router.post('/session/heartbeat', protect, checkActiveSession);


module.exports = router;

