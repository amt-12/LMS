const Subject = require('../../models/Subject');
const Course = require('../../models/Course');

const updateSubject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const { title, courseId } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (title) {
      subject.title = title.trim();
    }

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      subject.courseId = courseId;
    }

    const updatedSubject = await subject.save();
    const populated = await Subject.findById(updatedSubject._id).populate('courseId', 'title');

    res.json({ 
      message: 'Subject updated successfully',
      subject: {
        key: updatedSubject._id,
        title: updatedSubject.title,
        course: populated.courseId.title,
        updated: new Date(updatedSubject.updatedAt).toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { updateSubject };

