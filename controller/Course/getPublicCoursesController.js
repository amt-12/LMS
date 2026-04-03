const Course = require('../../models/Course');

const getPublicCourses = async (req, res) => {
  try {
    // Only return active courses for students
    const courses = await Course.find({ status: 'active' })
      .select('title description imageUrl')
      .sort({ createdAt: -1 })
      .lean();

    const courseList = courses.map(course => ({
      key: course._id,
      title: course.title,
      description: course.description,
      image: course.imageUrl || '',
    }));

    res.json({ courses: courseList });
  } catch (error) {
    console.error('Get public courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getPublicCourses };
