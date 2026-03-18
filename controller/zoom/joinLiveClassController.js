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
    if (!liveClass || liveClass.status === 'completed') {
      return res.status(404).json({
        success: false,
        message: 'Live class not found or completed'
      });
    }

    const joinRecord = new StudentLiveClassJoin({
      studentId,
      liveClassId,
      deviceType
    });

    await joinRecord.save();

    await StudentLiveClassJoin.updateMany(
      { studentId, liveClassId, active: true },
      { active: false }
    );

    res.json({
      success: true,
      data: {
        joinUrl: liveClass.joinUrl,
        password: liveClass.password,
        message: 'Joined. Preference: ' + deviceType
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports ={joinLiveClassController}