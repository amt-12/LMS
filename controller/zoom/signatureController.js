const zoomService = require('../../services/zoomService');
const User = require('../../models/Auth/User');
const LiveClass = require('../../models/LiveClass');

const signatureController = async (req, res) => {
  try {
    const { meetingNumber, role } = req.body;

    if (!meetingNumber) {
      return res.status(400).json({
        success: false,
        message: 'meetingNumber is required'
      });
    }

    // Role: 0 for participant, 1 for host. Default to 0 if not provided.
    const userRole = role !== undefined ? Number(role) : 0;

    // Security check: Only admins can be hosts
    if (userRole === 1 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only admins can join as host'
      });
    }


    // Enrollment check for participants
    if (userRole === 0) {
      const studentId = req.user.userId || req.user.id;
      const student = await User.findById(studentId).select('role enrolledSubjects');

      if (!student) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (student.role === 'student') {
        const liveClass = await LiveClass.findOne({ zoomMeetingId: meetingNumber }).populate('subjectId', 'title');
        if (!liveClass) {
          return res.status(404).json({ success: false, message: 'Live class not found' });
        }
        if (!student.enrolledSubjects?.includes(liveClass.subjectId._id)) {
          return res.status(403).json({
            success: false,
            message: `Not enrolled for subject: ${liveClass.subjectId.title}`
          });
        }
      }
    }

    let responseData = {
      success: true,
      meetingNumber,
      role: userRole
    };

    if (userRole === 1) {
      // Host: Return ZAK token ONLY. No signature, SDK Key, or appKey needed.
      const zak = await zoomService.getZakToken();
      responseData.zak = zak;

      // Force-disable auto-recording for this meeting right before joining as host
      try {
        const liveClass = await LiveClass.findOne({ zoomMeetingId: meetingNumber });
        if (liveClass) {
          await zoomService.updateMeeting(
            meetingNumber,
            liveClass.title,
            liveClass.startTime,
            liveClass.duration
          );
        }
      } catch (err) {
        console.warn('Pre-join meeting update failed in signatureController:', err.message);
      }
    } else {
      // Participant: Return Signature and SDK Key. No ZAK token.
      const signatureData = await zoomService.generateSignature(meetingNumber, userRole);
      responseData = {
        ...responseData,
        ...signatureData
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Zoom auth generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { signatureController };
