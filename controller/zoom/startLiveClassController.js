const LiveClass = require('../../models/LiveClass');

const startLiveClassController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;

    const liveClass = await LiveClass.findById(liveClassId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Live class has already been completed'
      });
    }

    if (liveClass.status === 'not-started') {
      liveClass.status = 'ongoing';
      await liveClass.save();
    }

    res.json({
      success: true,
      data: liveClass,
      message: 'Live class started successfully'
    });
  } catch (error) {
    console.error('Start live class error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { startLiveClassController };
