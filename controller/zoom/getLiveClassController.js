const LiveClass = require('../../models/LiveClass');

const getLiveClassController = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id).populate('createdBy', 'name');
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Compute dynamic status
    const now = new Date();
    const endTime = liveClass.endTime || new Date(liveClass.startTime.getTime() + liveClass.duration * 60 * 1000);
    
    let computedStatus;
    if (now < liveClass.startTime) {
      computedStatus = 'not-started';
    } else if (now < endTime) {
      computedStatus = 'ongoing';
    } else {
      computedStatus = 'completed';
    }
    
    // Override for response
    liveClass.status = computedStatus;
    liveClass.endTime = endTime;

    res.json({
      success: true,
      data: liveClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getLiveClassController };

