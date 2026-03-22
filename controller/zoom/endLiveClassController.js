const LiveClass = require('../../models/LiveClass');
const zoomService = require('../../services/zoomService');

const endLiveClassController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.status !== 'completed') {
      liveClass.status = 'completed';
      
      // If we don't have an endTime set yet, set it to now
      liveClass.endTime = new Date();
      await liveClass.save();
    }

    // Call Zoom API to end meeting for all participants
    if (liveClass.zoomMeetingId) {
      try {
        await zoomService.endMeeting(liveClass.zoomMeetingId);
        console.log(`Zoom Meeting ${liveClass.zoomMeetingId} ended successfully.`);
      } catch (zoomError) {
        console.error('Failed to end Zoom meeting via API:', zoomError.message);
        // Continue even if Zoom API fails, since we updated the local status
      }
    }

    res.json({
      success: true,
      data: liveClass,
      message: 'Live class ended successfully for all participants'
    });
  } catch (error) {
    console.error('End live class error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { endLiveClassController };
