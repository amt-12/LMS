const LiveClass = require('../../models/LiveClass');
const zoomService = require('../../services/zoomService');

const updateLiveClassController = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subjectId, startTime, duration } = req.body;

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    if (liveClass.status === 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an ongoing class. End the meeting first.',
      });
    }

    // Build updated fields
    const updates = {};
    if (title) updates.title = title;
    if (subjectId) updates.subjectId = subjectId;

    if (startTime || duration) {
      const newStartTime = startTime ? new Date(startTime) : liveClass.startTime;
      const newDuration = duration || liveClass.duration;
      updates.startTime = newStartTime;
      updates.duration = newDuration;
      updates.endTime = new Date(newStartTime.getTime() + newDuration * 60 * 1000);
    }

    // Sync with Zoom
    try {
      await zoomService.updateMeeting(
        liveClass.zoomMeetingId,
        updates.title || liveClass.title,
        updates.startTime || liveClass.startTime,
        updates.duration || liveClass.duration
      );
    } catch (zoomError) {
      console.warn('Zoom update failed (non-fatal):', zoomError.message);
      // Continue — still update DB even if Zoom sync partially fails
    }

    const updated = await LiveClass.findByIdAndUpdate(id, updates, { new: true })
      .populate({ path: 'subjectId', populate: { path: 'courseId', select: 'title' } });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateLiveClassController error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { updateLiveClassController };
