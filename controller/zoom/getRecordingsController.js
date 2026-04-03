const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');

const getRecordingsController = async (req, res) => {
  try {
    const rawMeetings = await zoomService.getRecordings();
    console.log('[getRecordingsController] Raw meetings from Zoom:', rawMeetings.length);

    // Enrich recordings with LiveClass database context
    const enrichedRecordings = await Promise.all(rawMeetings.map(async (rec) => {
      // Find matching live class in DB by Zoom Meeting ID
      const liveClass = await LiveClass.findOne({ zoomMeetingId: rec.id.toString() }).populate('subjectId');

      // Log what recording_files look like for debugging
      console.log(`[Recording] Meeting ${rec.id} | topic="${rec.topic}" | files=${JSON.stringify((rec.recording_files || []).map(f => ({ type: f.file_type, status: f.status, has_play: !!f.play_url, has_dl: !!f.download_url })))}`);

      const payload = {
        id: rec.uuid,
        meetingId: rec.id,
        title: liveClass ? liveClass.title : rec.topic,
        subject: liveClass && liveClass.subjectId
          ? (liveClass.subjectId.name || liveClass.subjectId.title || 'General')
          : 'General',
        duration: rec.duration ? `${rec.duration} min` : 'N/A',
        date: rec.start_time,
        play_url: '',
      };

      if (rec.recording_files && rec.recording_files.length > 0) {
        // Prefer MP4 video file, fall back to any completed file
        const completedFiles = rec.recording_files.filter(f => f.status === 'completed' || !f.status);
        const videoFile = completedFiles.find(f => f.file_type === 'MP4') || completedFiles[0];

        if (videoFile) {
          // play_url is for browser streaming; download_url as fallback
          payload.play_url = videoFile.play_url || videoFile.download_url || '';
        }
      }

      return payload;
    }));

    // Filter out meetings that do not have a play URL
    const validRecordings = enrichedRecordings.filter(rec => rec.play_url);
    console.log('[getRecordingsController] Valid recordings with play_url:', validRecordings.length, '/', enrichedRecordings.length);

    // Sort by most recent
    validRecordings.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: validRecordings.length,
      data: validRecordings,
      // Include debug info so the admin can understand the raw state
      debug: {
        totalMeetingsFromZoom: rawMeetings.length,
        meetingsWithRecordingFiles: enrichedRecordings.filter(r => r.play_url || true).length,
        validWithPlayUrl: validRecordings.length,
      }
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