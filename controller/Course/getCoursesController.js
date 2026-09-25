const Course = require('../../models/Course');

const getCourses = async (req, res) => {
  try {
    // Admin check (following Student pattern)
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access only' });
    // }

    const { search, status, page, limit } = req.query;
    const query = { status: status || { $ne: null } };

    if (search) {
      query.$text = { $search: search };
    }

    let coursesQuery = Course.find(query)
      .select('title description status imageUrl createdAt')
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);
    const limitNum = limit !== undefined ? parseInt(limit) : 0;
    const pageNum = page ? parseInt(page) : 1;

    if (limitNum > 0) {
      coursesQuery = coursesQuery.limit(limitNum).skip((pageNum - 1) * limitNum);
    }

    const courses = await coursesQuery.lean();

    // Format for frontend (like Students)
    const courseList = courses.map(course => ({
      key: course._id,
      title: course.title,
      description: course.description,
      status: course.status,
      image: course.imageUrl || '',
      created: new Date(course.createdAt).toLocaleDateString()
    }));

    res.json({
      courses: courseList,
      pagination: {
        page: pageNum,
        limit: limitNum || total,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getCourses };

