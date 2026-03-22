const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');

const getRecordingsController = async (req, res) => {
  try {
    const recordings = await zoomService.getRecordings();

    // Enrich recordings with LiveClass database context
    const enrichedRecordings = await Promise.all(recordings.map(async (rec) => {
      // Find matching live class in DB by Zoom Meeting ID
      const liveClass = await LiveClass.findOne({ zoomMeetingId: rec.id.toString() }).populate('subjectId');

      const payload = {
        id: rec.uuid,
        meetingId: rec.id,
        title: liveClass ? liveClass.title : rec.topic,
        subject: liveClass && liveClass.subjectId ? (liveClass.subjectId.name || liveClass.subjectId.title || 'General') : 'General',
        duration: rec.duration ? `${rec.duration} min` : 'N/A',
        date: rec.start_time,
        play_url: '',
      };

      if (rec.recording_files && rec.recording_files.length > 0) {
        // Find the MP4 video file
        const videoFile = rec.recording_files.find(f => f.file_type === 'MP4');
        if (videoFile) {
          payload.play_url = videoFile.play_url;
        } else {
          payload.play_url = rec.recording_files[0].play_url;
        }
      }

      return payload;
    }));

    // Filter out meetings that do not have a play URL
    const validRecordings = enrichedRecordings.filter(rec => rec.play_url);

    // Sort by most recent
    validRecordings.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: validRecordings.length,
      data: validRecordings
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings',
      error: error.message
    });
  }
};
module.exports = { getRecordingsController }