const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

const getSubjects = async (req, res) => {
  try {
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access only' });
    // }

    const { courseId, search, page, limit } = req.query;
    let query = {};

    if (courseId) {
      query.courseId = courseId;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    let subjectsQuery = Subject.find(query)
      .populate('courseId', 'title')
      .select('title courseId createdAt')
      .sort({ createdAt: -1 });

    const total = await Subject.countDocuments(query);
    const limitNum = limit !== undefined ? parseInt(limit) : 0;
    const pageNum = page ? parseInt(page) : 1;

    if (limitNum > 0) {
      subjectsQuery = subjectsQuery.limit(limitNum).skip((pageNum - 1) * limitNum);
    }

    const subjects = await subjectsQuery.lean();

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
      pagination: {
        page: pageNum,
        limit: limitNum || total,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
      }
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSubjects };

