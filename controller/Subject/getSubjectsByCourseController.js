const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

const getSubjectsByCourse = async (req, res) => {
  try {
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access only' });
    // }

    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const subjects = await Subject.find({ courseId })
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    const subjectList = subjects.map(s => ({
      key: s._id,
      title: s.title,
      course: s.courseId.title
    }));

    res.json({ subjects: subjectList });
  } catch (error) {
    console.error('Get subjects by course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSubjectsByCourse };

