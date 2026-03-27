const LiveClass = require('../../models/LiveClass');
const zoomService = require('../../services/zoomService');

const deleteLiveClassController = async (req, res) => {
  try {
    const { id } = req.params;

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    if (liveClass.status === 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an ongoing class. End the meeting first.',
      });
    }

    // Delete from Zoom (best-effort)
    try {
      await zoomService.deleteMeeting(liveClass.zoomMeetingId);
    } catch (zoomError) {
      console.warn('Zoom delete failed (non-fatal):', zoomError.message);
      // Still delete from DB regardless
    }

    await LiveClass.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('deleteLiveClassController error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { deleteLiveClassController };
