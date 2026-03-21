const Course = require('../../models/Course');

const getCourses = async (req, res) => {
  try {
    // Admin check (following Student pattern)
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access only' });
    // }

    const { search, status, page = 1, limit = 10 } = req.query;
    const query = { status: status || { $ne: null } };

    if (search) {
      query.$text = { $search: search };
    }

    const courses = await Course.find(query)
      .select('title description status imageUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Course.countDocuments(query);

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
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getCourses };

