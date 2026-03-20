const express = require('express');
const router = express.Router();
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const { createLiveClassController } = require('../../controller/zoom/createLiveClassController');
const { getLiveClassesController } = require('../../controller/zoom/getLiveClassesController');
const { getLiveClassController } = require('../../controller/zoom/getLiveClassController');
const { joinLiveClassController } = require('../../controller/zoom/joinLiveClassController');
const { hostJoinLiveClassController } = require('../../controller/zoom/hostJoinLiveClassController');
const { signatureController } = require('../../controller/zoom/signatureController');
const { setReminderController } = require('../../controller/zoom/setReminderController');

// Signature for all
router.post('/signature', signatureController);

// Admin only: create, get all
router.post('/', authMiddleware, createLiveClassController);
router.get('/', authMiddleware, getLiveClassesController);

// Public/student: get single
router.get('/:id', getLiveClassController);

// Student reminder
router.post('/:id/reminder', authMiddleware, setReminderController);

// Admin host join config + signature
router.get('/:id/host', authMiddleware, hostJoinLiveClassController);

// Student join
router.post('/join', authMiddleware, joinLiveClassController);

module.exports = router;

