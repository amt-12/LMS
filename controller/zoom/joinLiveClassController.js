const StudentLiveClassJoin = require('../../models/StudentLiveClassJoin');
const LiveClass = require('../../models/LiveClass');

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

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check computed status (fetch fresh)
    const now = new Date();
    const endTime = liveClass.endTime || new Date(liveClass.startTime.getTime() + liveClass.duration * 60 * 1000);
    const computedStatus = now < liveClass.startTime ? 'not-started' : now < endTime ? 'ongoing' : 'completed';
    
    if (computedStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Live class has ended'
      });
    }

    // Check if first join - start class if was not-started
    const joinCount = await StudentLiveClassJoin.countDocuments({ liveClassId, active: true });
    if (computedStatus === 'not-started' && joinCount === 0) {
      liveClass.status = 'ongoing';
      await liveClass.save();
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
        status: computedStatus === 'not-started' ? 'ongoing' : computedStatus, // now ongoing
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

