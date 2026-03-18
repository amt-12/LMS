const zoomService = require('../../services/zoomService');

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
