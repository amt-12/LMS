const LiveClass = require('../../models/LiveClass');
const zoomService = require('../../services/zoomService');

const hostJoinLiveClassController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;

    const liveClass = await LiveClass.findById(liveClassId).populate('createdBy', 'name');
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Live class completed'
      });
    }

    const meetingNumber = liveClass.zoomMeetingId;
    if (!meetingNumber) {
      return res.status(400).json({
        success: false,
        message: 'No Zoom meeting created for this class'
      });
    }

    // Get password from class or generate if null
    let password = liveClass.password || zoomService.generatePassword();

    // Generate SDK signature for host
    const signatureData = await zoomService.generateSignature(meetingNumber, '1'); // host

    res.json({
      success: true,
      data: {
        ...signatureData,
        password,
        role: 1 // host
      }
    });
  } catch (error) {
    console.error('Host join error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { hostJoinLiveClassController };
