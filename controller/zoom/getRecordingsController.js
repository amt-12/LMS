const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');

// In-memory cache to prevent rate limit hits on password updates
// Key: meetingId, Value: { passwordRemoved: true, timestamp }
const PASSWORD_CACHE = new Map();

const getRecordingsController = async (req, res) => {
  // Cleanup old cache entries (older than 24h)
  const now = Date.now();

  for (const [key, value] of PASSWORD_CACHE.entries()) {
    if (now - value.timestamp > 24 * 60 * 60 * 1000) {
      PASSWORD_CACHE.delete(key);
    }
  }

  try {
    const rawMeetings = await zoomService.getRecordings();

    // Hide recently deleted recordings
    const DELETED_MEETINGS = global.__DELETED_ZOOM_MEETINGS__;
    const deletedTtlMs = 30 * 60 * 1000; // 30 minutes

    // Defensive: ensure cache exists
    if (!DELETED_MEETINGS) {
      global.__DELETED_ZOOM_MEETINGS__ = new Map();
    }


    // Enrich recordings with DB context + remove passcodes
    const enrichedRecordings = await Promise.all(
      rawMeetings.map(async (rec) => {
        try {
          // Skip recently deleted meetings
          if (DELETED_MEETINGS?.has(rec.id.toString())) {
            const ts = DELETED_MEETINGS.get(rec.id.toString());

            if (ts && Date.now() - ts < deletedTtlMs) {
              return null;
            }
          }

          let liveClass = null;

          // Find matching live class in DB
          try {
            liveClass = await LiveClass.findOne({
              zoomMeetingId: rec.id.toString(),
            }).populate('subjectId');
          } catch (dbError) {
            console.warn(
              `[getRecordingsController] DB lookup failed for meeting ${rec.id}:`,
              dbError.message
            );
          }

          // Password removal caching
          const cacheKey = rec.id.toString();
          const cached = PASSWORD_CACHE.get(cacheKey);

          if (!cached && rec.password) {
            try {
              await zoomService.updateMeetingPassword(rec.id, false);

              PASSWORD_CACHE.set(cacheKey, {
                passwordRemoved: true,
                timestamp: Date.now(),
              });

              console.log(
                `[getRecordingsController] Password removed for ${rec.id}`
              );
            } catch (meetingError) {
              console.warn(
                `[getRecordingsController] Could not update meeting ${rec.id}:`,
                meetingError.message
              );

              // Cache failure to avoid repeated retries
              PASSWORD_CACHE.set(cacheKey, {
                passwordRemoved: false,
                timestamp: Date.now(),
                error: meetingError.message,
              });
            }
          } else if (cached) {
            console.log(
              `[Cache HIT] Skipping password update for ${rec.id}`
            );
          } else {
            console.log(
              `[getRecordingsController] No password field on meeting ${rec.id}`
            );
          }

          const payload = {
            id: rec.uuid,
            meetingId: rec.id,
            title: liveClass ? liveClass.title : rec.topic,
            subject:
              liveClass && liveClass.subjectId
                ? liveClass.subjectId.name ||
                  liveClass.subjectId.title ||
                  'General'
                : 'General',
            duration: rec.duration ? `${rec.duration} min` : 'N/A',
            date: rec.start_time,
            play_url: '',
            video_url: '',
            proxy_url: '',
          };

          // Handle recording files
          if (
            rec.recording_files &&
            Array.isArray(rec.recording_files) &&
            rec.recording_files.length > 0
          ) {
            const completedFiles = rec.recording_files.filter(
              (f) => f.status === 'completed' || !f.status
            );

            // Prefer MP4 files
            const mp4File = completedFiles.find(
              (f) => f.file_type === 'MP4'
            );

            if (mp4File) {
              payload.video_url = mp4File.download_url || '';

              payload.play_url =
                mp4File.play_url ||
                mp4File.download_url ||
                '';

              // Proxy URL for CORS-safe playback
              if (payload.video_url) {
                payload.proxy_url =
                  `/api/live-classes/recordings/proxy?video_url=` +
                  encodeURIComponent(payload.video_url);
              }
            } else {
              // Fallback to first available completed file
              const videoFile = completedFiles[0];

              if (videoFile) {
                payload.video_url =
                  videoFile.download_url || '';

                payload.play_url =
                  videoFile.play_url ||
                  videoFile.download_url ||
                  '';
              }
            }
          }

          return payload;
        } catch (innerError) {
          console.error(
            `[getRecordingsController] Error processing meeting ${rec.id}:`,
            innerError.message
          );

          return null;
        }
      })
    );

    // Remove invalid/null recordings
    const validRecordings = enrichedRecordings.filter(
      (rec) => rec && (rec.play_url || rec.video_url)
    );

    // Sort newest first
    validRecordings.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return res.json({
      success: true,
      count: validRecordings.length,
      data: validRecordings,

      debug: {
        totalMeetingsFromZoom: rawMeetings.length,

        meetingsWithRecordingFiles: enrichedRecordings.filter(
          (r) => r && (r.play_url || r.video_url)
        ).length,

        validWithPlayUrl: validRecordings.length,
      },
    });
  } catch (error) {
    console.error('Get recordings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings',
      error: error.message,
    });
  }
};

module.exports = {
  getRecordingsController,
};