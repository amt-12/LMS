const LiveClass = require('../../models/LiveClass');

const getLiveClassesController = async (req, res) => {
  try {
    const liveClasses = await LiveClass.find().populate('createdBy', 'name').sort({ startTime: -1 });
    res.json({
      success: true,
      data: liveClasses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
module.exports = {getLiveClassesController}

