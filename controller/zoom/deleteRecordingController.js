const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');

// Shared in-memory cache (used by getRecordingsController to hide recently deleted recordings)
const DELETED_MEETINGS = global.__DELETED_ZOOM_MEETINGS__ || new Map();
global.__DELETED_ZOOM_MEETINGS__ = DELETED_MEETINGS;

const deleteRecordingController = async (req, res) => {
  try {
    const meetingId = req.query.meetingId || req.body?.meetingId;


    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'meetingId is required',
      });
    }

    await zoomService.deleteRecording(meetingId);

    // Delete from Mongo as well (your recordings list is backed by LiveClass documents)
    // LiveClass.zoomMeetingId is unique and stores the zoom meeting id.
    await LiveClass.deleteMany({ zoomMeetingId: meetingId.toString() });

    // Hide this meeting for a short time in /recordings/all (Zoom may take a bit to reflect deletions)
    DELETED_MEETINGS.set(meetingId.toString(), Date.now());

    return res.status(200).json({
      success: true,
      message: 'Recording deleted successfully',
    });
  } catch (error) {
    console.error('deleteRecordingController error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to delete recording',
    });
  }
};

module.exports = { deleteRecordingController };

