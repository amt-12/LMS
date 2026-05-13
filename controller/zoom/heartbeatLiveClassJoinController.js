const StudentLiveClassJoin = require('../../models/StudentLiveClassJoin');

/**
 * Heartbeat check from the currently opened device.
 * If backend says the session is not active anymore -> frontend should exit/logout.
 */
const heartbeatLiveClassJoinController = async (req, res) => {
  try {
    const studentId = req.user.userId || req.user.id;
    const { liveClassId, deviceSessionId } = req.body || {};

    if (!liveClassId || !deviceSessionId) {
      return res.status(400).json({
        success: false,
        message: 'liveClassId and deviceSessionId are required'
      });
    }

    const activeJoin = await StudentLiveClassJoin.findOne({
      studentId,
      liveClassId,
      deviceSessionId,
      active: true
    }).select('active');

    // If this device was deactivated, do NOT tell the client to logout.
    // Just report active=false so the UI can decide what to do.
    const isActive = !!activeJoin;

    return res.json({
      success: true,
      data: {
        active: isActive
      }
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { heartbeatLiveClassJoinController };

