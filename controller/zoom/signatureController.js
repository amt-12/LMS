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

    console.log('--- Signature & ZAK Request ---');
    console.log('Body:', req.body);

    // Enrollment check for participants
    if (userRole === 0) {
      const studentId = req.user.id;
      const student = await User.findById(studentId).select('role enrolledSubjects');
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
      console.log('Generating ZAK token for host...');
      const zak = await zoomService.getZakToken();
      responseData.zak = zak;
      console.log('ZAK Token fetched successfully (truncated):', zak.substring(0, 5) + '...');
    } else {
      // Participant: Return Signature and SDK Key. No ZAK token.
      console.log('Generating signature for participant...');
      const signatureData = await zoomService.generateSignature(meetingNumber, userRole);
      responseData = {
        ...responseData,
        ...signatureData
      };
    }

    console.log('Final Response:', JSON.stringify(responseData, null, 2));
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
