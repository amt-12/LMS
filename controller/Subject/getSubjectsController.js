const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

const getSubjects = async (req, res) => {
  try {
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access only' });
    // }

    const { courseId, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (courseId) {
      query.courseId = courseId;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const subjects = await Subject.find(query)
      .populate('courseId', 'title')
      .select('title courseId createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Subject.countDocuments(query);

    // Format for frontend
    const subjectList = subjects.map(subject => ({
      key: subject._id,
      title: subject.title,
      course: subject.courseId?.title || 'Unknown',
      status: 'Active',
      lectures: 0, // Can be enhanced later
      created: new Date(subject.createdAt).toLocaleDateString()
    }));

    res.json({
      subjects: subjectList,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSubjects };

