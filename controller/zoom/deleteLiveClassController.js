const LiveClass = require('../../models/LiveClass');
const mongoose = require('mongoose');
const zoomService = require('../../services/zoomService');

const deleteLiveClassController = async (req, res) => {
  try {
    const { id } = req.params;

    let liveClass;
    try {
      liveClass = await LiveClass.findById(id);
    } catch (castError) {
      if (castError.name === 'CastError') {
        liveClass = await LiveClass.findOne({ slug: id });
      } else {
        throw castError;
      }
    }
    
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

    const deleteId = mongoose.Types.ObjectId.isValid(id) ? id : liveClass._id;
    await LiveClass.findByIdAndDelete(deleteId || liveClass._id);

    res.status(200).json({ success: true, message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('deleteLiveClassController error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { deleteLiveClassController };
