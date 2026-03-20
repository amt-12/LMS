const Course = require('../../models/Course');

const updateCourse = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const { title, description, status, imageUrl } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update fields
    course.title = title ? title.trim() : course.title;
    course.description = description ? description.trim() : course.description;
    course.status = status || course.status;
    course.imageUrl = imageUrl || course.imageUrl;

    const updatedCourse = await course.save();

    res.json({ 
      message: 'Course updated successfully',
      course: {
        key: updatedCourse._id,
        title: updatedCourse.title,
        description: updatedCourse.description,
        status: updatedCourse.status.charAt(0).toUpperCase() + updatedCourse.status.slice(1),
        updated: new Date(updatedCourse.updatedAt).toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { updateCourse };

