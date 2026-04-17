const LiveClass = require('../../models/LiveClass');
const mongoose = require('mongoose');

const getLiveClassController = async (req, res) => {
  try {
    let liveClass;
    const id = req.params.id;
    
    try {
      liveClass = await LiveClass.findById(id).populate('createdBy', 'name');
    } catch (castError) {
      if (castError.name === 'CastError') {
        // Try slug lookup
        liveClass = await LiveClass.findOne({ slug: id }).populate('createdBy', 'name');
      } else {
        throw castError;
      }
    }
    
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Ensure endTime is set if missing
    if (!liveClass.endTime) {
      liveClass.endTime = new Date(liveClass.startTime.getTime() + liveClass.duration * 60 * 1000);
    }

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
