const LiveClass = require('../../models/LiveClass');

const getLiveClassesController = async (req, res) => {
  try {
    const liveClasses = await LiveClass.find().populate('createdBy', 'name').populate({
      path: 'subjectId',
      select: 'title courseId',
      populate: { path: 'courseId', select: 'title' }
    }).sort({ startTime: -1 });
    
    // Compute dynamic status for each class
    const now = new Date();
    const classesWithStatus = liveClasses.map(liveClass => {
      const endTime = liveClass.endTime || new Date(liveClass.startTime.getTime() + liveClass.duration * 60 * 1000);
      
      let computedStatus;
      if (now < liveClass.startTime) {
        computedStatus = 'not-started';
      } else if (now < endTime) {
        computedStatus = 'ongoing';
      } else {
        computedStatus = 'completed';
      }
      
      // Override status for response (don't save to DB)
      liveClass.status = computedStatus;
      liveClass.endTime = endTime; // Ensure endTime is set
      
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

