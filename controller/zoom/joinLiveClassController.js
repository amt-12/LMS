const StudentLiveClassJoin = require('../../models/StudentLiveClassJoin');
const LiveClass = require('../../models/LiveClass');
const User = require('../../models/Auth/User');

const joinLiveClassController = async (req, res) => {
  try {
    const { liveClassId } = req.body;
    const studentId = req.user.userId || req.user.id;
    const deviceType = req.body.deviceType || 'web';
    const deviceSessionId = req.body.deviceSessionId;

    if (!deviceSessionId) {
      return res.status(400).json({ success: false, message: 'deviceSessionId is required' });
    }

    // Fetch the live class
    const liveClass = await LiveClass.findById(liveClassId).populate('subjectId', 'title');
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Enrollment check
    const student = await User.findById(studentId).select('role enrolledSubjects');

    if (!student) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (student.role === 'student') {
      if (!student.enrolledSubjects?.includes(liveClass.subjectId._id)) {
        return res.status(403).json({
          success: false,
          message: `Not enrolled for subject: ${liveClass.subjectId.title}`
        });
      }
    }

    if (liveClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Live class has ended.'
      });
    }

    if (liveClass.status === 'not-started') {
      return res.status(403).json({
        success: false,
        message: 'The host has not started the meeting yet. Please wait.'
      });
    }
    const joinRecord = new StudentLiveClassJoin({
      studentId,
      liveClassId,
      deviceSessionId,
      deviceType,
      active: true
    });

    await joinRecord.save();

    // Deactivate old joins for same student/class (kick older devices)
    await StudentLiveClassJoin.updateMany(
      { studentId, liveClassId, active: true, _id: { $ne: joinRecord._id } },
      { active: false }
    );

    // For the same student+class, the active session becomes the latest one.
    res.json({
      success: true,
      data: {
        joinUrl: liveClass.joinUrl,
        password: liveClass.password,
        status: liveClass.status,
        message: 'Joined successfully. Active session switched.'
      }
    });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { joinLiveClassController };

