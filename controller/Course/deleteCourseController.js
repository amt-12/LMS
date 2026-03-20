const Course = require('../../models/Course');
const Subject = require('../../models/Subject');

const deleteCourse = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Cascade delete all subjects under this course
    await Subject.deleteMany({ courseId: id });

    // Delete course
    await Course.deleteOne({ _id: id });

    res.json({ 
      message: 'Course and all its subjects deleted successfully' 
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { deleteCourse };

