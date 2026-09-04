const User = require('../../models/Auth/User');
const LiveClass = require('../../models/LiveClass');
const Subject = require('../../models/Subject');

const getLiveClassesController = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('role status enrollment enrolledCourses enrolledSubjects');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let query = {};
    
    // For students
    if (user.role === 'student') {
      const isEnrolled =
        user.enrollment === 'active' ||
        user.status === 'active' ||
        (user.enrolledSubjects && user.enrolledSubjects.length > 0) ||
        (user.enrolledCourses && user.enrolledCourses.length > 0);

      if (isEnrolled) {
        let allowedSubjectIds = new Set();

        if (user.enrolledSubjects && user.enrolledSubjects.length > 0) {
          user.enrolledSubjects.forEach((id) => allowedSubjectIds.add(id.toString()));
        } else if (user.enrolledCourses && user.enrolledCourses.length > 0) {
          const courseSubjects = await Subject.find({
            courseId: { $in: user.enrolledCourses },
          })
            .select('_id')
            .lean();
          courseSubjects.forEach((s) => allowedSubjectIds.add(s._id.toString()));
        }

        query.subjectId = { $in: Array.from(allowedSubjectIds) };
      } else {
        // Unenrolled students see demo classes only
        query = { isDemo: true };
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
