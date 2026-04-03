const Course = require('../../models/Course');

const createCourse = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { title, description, status, imageUrl } = req.body;

    // Basic validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const course = new Course({
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'active',
      imageUrl: imageUrl || ''
    });

    const savedCourse = await course.save();

    res.status(201).json({ 
      message: 'Course created successfully',
      course: {
        key: savedCourse._id,
        title: savedCourse.title,
        description: savedCourse.description,
        status: savedCourse.status.charAt(0).toUpperCase() + savedCourse.status.slice(1),
        created: new Date(savedCourse.createdAt).toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Course with this title already exists' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createCourse };

