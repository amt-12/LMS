const LiveClass = require('../../models/LiveClass');

const getLiveClassesController = async (req, res) => {
  try {
    const liveClasses = await LiveClass.find().populate('createdBy', 'name').populate({
      path: 'subjectId',
      select: 'title courseId',
      populate: { path: 'courseId', select: 'title' }
    }).sort({ startTime: -1 });
    
    // Process end times and enforce explicit DB status
    const classesWithStatus = liveClasses.map(liveClass => {
      // Ensure endTime is set
      if (!liveClass.endTime) {
        liveClass.endTime = new Date(liveClass.startTime.getTime() + liveClass.duration * 60 * 1000);
      }
      return liveClass;
    });

    res.json({
      success: true,
      data: classesWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getLiveClassesController };

