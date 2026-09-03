const zoomService = require('../../services/zoomService');
const LiveClass = require('../../models/LiveClass');
const User = require('../../models/Auth/User');
const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

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
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const user = await User.findById(userId)
      .select('role status enrollment course enrolledCourses enrolledSubjects')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Determine allowed subject IDs for students
    let allowedSubjectIds = null;

    if (user.role === 'student') {
      if (user.enrollment !== 'active' || user.status === 'inactive') {
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }

      allowedSubjectIds = new Set();

      const userEnrolledSubjIds = (user.enrolledSubjects || []).map((id) =>
        id.toString()
      );

      // PRECEDENCE RULE:
      // If student is assigned specific subjects in enrolledSubjects, ONLY allow those subjects!
      if (userEnrolledSubjIds.length > 0) {
        userEnrolledSubjIds.forEach((id) => allowedSubjectIds.add(id));

        // Also query DB for matching subject ObjectIds and titles so we match by both ID and Title
        const queryOr = [{ _id: { $in: userEnrolledSubjIds } }];
        queryOr.push({ title: { $in: userEnrolledSubjIds } });

        const matchedSubjects = await Subject.find({ $or: queryOr })
          .select('_id title')
          .lean();

        matchedSubjects.forEach((s) => {
          allowedSubjectIds.add(s._id.toString());
          if (s.title) {
            allowedSubjectIds.add(s.title.trim().toLowerCase());
          }
        });
      } else {
        // Fallback: If NO specific enrolledSubjects assigned, allow all subjects under enrolledCourses / course name
        const userEnrolledCourseIds = (user.enrolledCourses || []).map((id) =>
          id.toString()
        );

        let extraCourseIds = [];
        if (
          user.course &&
          typeof user.course === 'string' &&
          user.course.trim().length > 0
        ) {
          const matchingCourses = await Course.find({
            title: { $regex: new RegExp(`^${user.course.trim()}$`, 'i') },
          })
            .select('_id')
            .lean();
          extraCourseIds = matchingCourses.map((c) => c._id.toString());
        }

        const allCourseIds = [
          ...new Set([...userEnrolledCourseIds, ...extraCourseIds]),
        ];

        if (allCourseIds.length > 0) {
          const matchedSubjects = await Subject.find({
            courseId: { $in: allCourseIds },
          })
            .select('_id title')
            .lean();

          matchedSubjects.forEach((s) => {
            allowedSubjectIds.add(s._id.toString());
            if (s.title) {
              allowedSubjectIds.add(s.title.trim().toLowerCase());
            }
          });
        }
      }
    }

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

          // If student, check if this recording belongs to an allowed subject
          if (user.role === 'student') {
            if (!liveClass || !liveClass.subjectId) {
              return null;
            }
            const recSubjectId = liveClass.subjectId._id
              ? liveClass.subjectId._id.toString()
              : liveClass.subjectId.toString();
            const recSubjectTitle = liveClass.subjectId.title
              ? liveClass.subjectId.title.trim().toLowerCase()
              : (liveClass.subjectId.name ? liveClass.subjectId.name.trim().toLowerCase() : null);

            const isAllowed =
              allowedSubjectIds.has(recSubjectId) ||
              (recSubjectTitle && allowedSubjectIds.has(recSubjectTitle));

            if (!isAllowed) {
              return null;
            }
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

          const basePayload = {
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

          const payloads = [];

          // Handle recording files
          if (
            rec.recording_files &&
            Array.isArray(rec.recording_files) &&
            rec.recording_files.length > 0
          ) {
            const completedFiles = rec.recording_files.filter(
              (f) => f.status === 'completed' || !f.status
            );

            const mp4Files = completedFiles.filter((f) => f.file_type === 'MP4');

            if (mp4Files.length > 0) {
              // Group MP4 files by segment (recording_start)
              const segments = {};
              mp4Files.forEach((f) => {
                const start = f.recording_start || f.id;
                if (!segments[start]) {
                  segments[start] = [];
                }
                segments[start].push(f);
              });

              let partIndex = 1;
              const sortedStarts = Object.keys(segments).sort((a, b) => {
                const timeA = new Date(a).getTime();
                const timeB = new Date(b).getTime();
                if (!isNaN(timeA) && !isNaN(timeB)) {
                  return timeA - timeB; // Earliest first
                }
                return a.localeCompare(b);
              });
              const hasMultipleSegments = sortedStarts.length > 1;

              for (const start of sortedStarts) {
                const segmentFiles = segments[start];
                // Prefer shared_screen_with_speaker_view
                let bestFile = segmentFiles.find((f) => f.recording_type === 'shared_screen_with_speaker_view');
                if (!bestFile) bestFile = segmentFiles.find((f) => f.recording_type === 'shared_screen_with_gallery_view');
                if (!bestFile) bestFile = segmentFiles.find((f) => f.recording_type === 'speaker_view');
                if (!bestFile) bestFile = segmentFiles[0];

                const pl = { ...basePayload };
                if (hasMultipleSegments) {
                  pl.title = `${pl.title} (Part ${partIndex})`;
                }
                // Set the specific segment's start time instead of the meeting start time
                if (bestFile.recording_start) {
                  pl.date = bestFile.recording_start;
                }
                
                // Use the file id to make the payload id unique
                pl.id = `${rec.uuid}-${bestFile.id || partIndex}`;
                pl.video_url = bestFile.download_url || '';
                pl.play_url = bestFile.play_url || bestFile.download_url || '';
                if (pl.video_url) {
                  pl.proxy_url = `/api/live-classes/recordings/proxy?video_url=` + encodeURIComponent(pl.video_url);
                }
                
                payloads.push(pl);
                partIndex++;
              }
            } else {
              // Fallback to first available completed file
              const videoFile = completedFiles[0];
              if (videoFile) {
                const pl = { ...basePayload };
                pl.video_url = videoFile.download_url || '';
                pl.play_url = videoFile.play_url || videoFile.download_url || '';
                payloads.push(pl);
              }
            }
          }

          return payloads.length > 0 ? payloads : null;
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
    const validRecordings = enrichedRecordings
      .flat()
      .filter((rec) => rec && (rec.play_url || rec.video_url));

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