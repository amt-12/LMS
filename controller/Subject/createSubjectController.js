const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

const createSubject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { title, courseId } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Subject title is required' });
    }

    if (!courseId) {
      return res.status(400).json({ error: 'Course is required' });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const subject = new Subject({
      title: title.trim(),
      courseId
    });

    const savedSubject = await subject.save();

    const populated = await Subject.findById(savedSubject._id).populate('courseId', 'title');

    res.status(201).json({ 
      message: 'Subject created successfully',
      subject: {
        key: savedSubject._id,
        title: savedSubject.title,
        course: populated.courseId.title,
        created: new Date(savedSubject.createdAt).toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Create subject error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Subject with this title already exists in the course' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createSubject };

