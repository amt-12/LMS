const StudentLiveClassJoin = require('../../models/StudentLiveClassJoin');
const LiveClass = require('../../models/LiveClass');
const User = require('../../models/Auth/User');

const joinLiveClassController = async (req, res) => {
  try {
    const { liveClassId } = req.body;
    const studentId = req.user.id;
    const deviceType = req.body.deviceType || 'web';

    const existingJoin = await StudentLiveClassJoin.findOne({
      studentId,
      liveClassId,
      active: true
    });

    if (existingJoin) {
      if (existingJoin.deviceType === deviceType) {
        return res.json({
          success: true,
          data: {
            joinUrl: existingJoin.liveClass.joinUrl,
            password: existingJoin.liveClass.password,
            message: 'Already joined on this device'
          }
        });
      } else {
        return res.status(409).json({
          success: false,
          message: `Already joined on ${existingJoin.deviceType}. Email admin to switch.`
        });
      }
    }

    const liveClass = await LiveClass.findById(liveClassId).populate('subjectId', 'title');
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Enrollment check
    const student = await User.findById(studentId).select('role enrolledSubjects');
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
      deviceType,
      active: true
    });

    await joinRecord.save();

    // Deactivate old joins for same student/class
    await StudentLiveClassJoin.updateMany(
      { studentId, liveClassId, active: true, _id: { $ne: joinRecord._id } },
      { active: false }
    );

    res.json({
      success: true,
      data: {
        joinUrl: liveClass.joinUrl,
        password: liveClass.password,
        status: liveClass.status,
        message: 'Joined successfully. Device preference: ' + deviceType
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

