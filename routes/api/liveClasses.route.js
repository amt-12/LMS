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
const { getRecordingsController } = require('../../controller/zoom/getRecordingsController');
const { startLiveClassController } = require('../../controller/zoom/startLiveClassController');
const { endLiveClassController } = require('../../controller/zoom/endLiveClassController');
const { updateLiveClassController } = require('../../controller/zoom/updateLiveClassController');
const { deleteLiveClassController } = require('../../controller/zoom/deleteLiveClassController');
const { recordingProxyController } = require('../../controller/zoom/recordingProxyController');
const { heartbeatLiveClassJoinController } = require('../../controller/zoom/heartbeatLiveClassJoinController');
const { deleteRecordingController } = require('../../controller/zoom/deleteRecordingController');


// Signature for all
router.post('/signature', authMiddleware, signatureController);


// Admin only: create, get all
router.post('/', authMiddleware, createLiveClassController);
router.get('/', authMiddleware, getLiveClassesController);

// Recordings endpoint
router.get('/recordings/all', authMiddleware, getRecordingsController);

// Proxy stream for video playback (no auth needed for playback after login check, but keep auth for safety)
router.get('/recordings/proxy', authMiddleware, recordingProxyController);

// Admin: delete Zoom recording (cloud recording)
router.delete('/recordings/delete', authMiddleware, deleteRecordingController);

// Public/student: get single
router.get('/:id', getLiveClassController);

// Student reminder
router.post('/:id/reminder', authMiddleware, setReminderController);

// Admin host join config + signature
router.get('/:id/host', authMiddleware, hostJoinLiveClassController);

// Admin explicit start / end meeting
router.put('/:id/start', authMiddleware, startLiveClassController);
router.put('/:id/end', authMiddleware, endLiveClassController);

// Admin: edit and delete a class
router.put('/:id', authMiddleware, updateLiveClassController);
router.delete('/:id', authMiddleware, deleteLiveClassController);

// Student join
router.post('/join', authMiddleware, joinLiveClassController);

// Heartbeat (kicked device -> should exit)
router.post('/join/heartbeat', authMiddleware, heartbeatLiveClassJoinController);

module.exports = router;

