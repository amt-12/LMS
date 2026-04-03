const User = require('../../models/Auth/User');
const LiveClass = require('../../models/LiveClass');

const getLiveClassesController = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('role enrollment enrolledCourses enrolledSubjects');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let query = {};
    
    // For students
    if (user.role === 'student') {
      if (user.enrollment === 'active') {
        // Enrolled students see classes for enrolled subjects/courses
        query.subjectId = { $in: user.enrolledSubjects };
      } else {
        // Unenrolled students see demo classes only (handled frontend or separate endpoint)
        query = { isDemo: true }; // Assume demo flag or filter frontend
      }
    }
    
    const liveClasses = await LiveClass.find(query)
      .populate('createdBy', 'name')
      .populate({
        path: 'subjectId',
        select: 'title courseId',
        populate: { path: 'courseId', select: 'title' }
      })
      .sort({ startTime: -1 });
    
    // Process end times
    const classesWithStatus = liveClasses.map(liveClass => {
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

module.exports = { getLiveClassesController };

