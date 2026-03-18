const LiveClass = require('../../models/LiveClass');

const getLiveClassController = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id).populate('createdBy', 'name');
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
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
module.exports = {getLiveClassController}
