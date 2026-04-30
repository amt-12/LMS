const LiveClass = require('../../models/LiveClass');
const mongoose = require('mongoose');
const zoomService = require('../../services/zoomService');

const hostJoinLiveClassController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;

    let liveClass;
    try {
      liveClass = await LiveClass.findById(liveClassId).populate('createdBy', 'name');
    } catch (castError) {
      if (castError.name === 'CastError') {
        liveClass = await LiveClass.findOne({ slug: liveClassId }).populate('createdBy', 'name');
      } else {
        throw castError;
      }
    }
    
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

    // Fetch ZAK token for host join
    const zak = await zoomService.getZakToken();

    // Generate signature for host (role=1)
    const signatureData = await zoomService.generateSignature(meetingNumber, 1);

    res.json({
      success: true,
      data: {
        meetingNumber,
        zak,
        password,
        role: 1, // host
        sdkKey: signatureData.sdkKey,
        signature: signatureData.signature,
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
