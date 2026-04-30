const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');

const getRecordingsController = async (req, res) => {
  // In-memory cache to prevent rate limit hits on password updates
  // Key: meetingId, Value: {passwordRemoved: true, timestamp}
  const PASSWORD_CACHE = new Map();
  
  // Cleanup old cache entries (older than 24h)
  const now = Date.now();
  for (const [key, value] of PASSWORD_CACHE.entries()) {
    if (now - value.timestamp > 24 * 60 * 60 * 1000) {
      PASSWORD_CACHE.delete(key);
    }
  }

  try {
    const rawMeetings = await zoomService.getRecordings();

    // Enrich recordings with LiveClass database context and remove passcode requirement
    const enrichedRecordings = await Promise.all(rawMeetings.map(async (rec) => {
      let liveClass;
      try {
        // Find matching live class in DB by Zoom Meeting ID
        liveClass = await LiveClass.findOne({ zoomMeetingId: rec.id.toString() }).populate('subjectId');
        
        // Skip password removal if cached OR no password field exists (prevents rate limits)
        const cacheKey = rec.id.toString();
        const cached = PASSWORD_CACHE.get(cacheKey);
        
        if (!cached && rec.password) {
          try {
            await zoomService.updateMeetingPassword(rec.id, false);
            PASSWORD_CACHE.set(cacheKey, { passwordRemoved: true, timestamp: Date.now() });
          } catch (meetingError) {
            console.warn(`[getRecordingsController] Could not access meeting ${rec.id}:`, meetingError.message);
            // Cache the failure to avoid retries
            PASSWORD_CACHE.set(cacheKey, { passwordRemoved: false, timestamp: Date.now(), error: meetingError.message });
          }
        } else if (cached) {
          console.log(`[Cache HIT] Skipping password check for ${rec.id}`);
        } else {
          console.log(`[getRecordingsController] No password field on meeting ${rec.id}, skipping`);
        }
      } catch (dbError) {
        console.warn(`[getRecordingsController] DB lookup failed for meeting ${rec.id}:`, dbError.message);
      }

      // Log what recording_files look like for debugging

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
        video_url: '', // Direct MP4 download for native player
        proxy_url: '',
      };

      if (rec.recording_files && rec.recording_files.length > 0) {
        // Prefer MP4 download_url for native playback, fallback play_url
        const completedFiles = rec.recording_files.filter(f => f.status === 'completed' || !f.status);
        const mp4File = completedFiles.find(f => f.file_type === 'MP4');
        
        if (mp4File) {
          payload.video_url = mp4File.download_url || '';
          payload.play_url = mp4File.play_url || mp4File.download_url || ''; // fallback
          
          // ALWAYS add proxy for reliable playback (bypasses CORS)
          if (payload.video_url) {
            payload.proxy_url = `/api/live-classes/recordings/proxy?video_url=${encodeURIComponent(payload.video_url)}`;
          } else {
            console.warn(`[getRecordingsController] NO video_url for ${rec.id} - skipping proxy`);
          }
        } else {
          const videoFile = completedFiles[0];
          if (videoFile) {
            payload.video_url = videoFile.download_url || '';
            payload.play_url = videoFile.play_url || videoFile.download_url || '';
          }
        }
      }

      return payload;
    }));

    // Filter out meetings that do not have a playable URL (prefer download_url)
    const validRecordings = enrichedRecordings.filter(rec => rec.play_url || rec.video_url);

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

module.exports = { getRecordingsController };

