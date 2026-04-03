const User = require("../../models/Auth/User");
const { sendEnrollmentEmail } = require("../../services/emailService");

const updateStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const { name, email, phone, address, status, enrollment, enrolledCourses, enrolledSubjects } = req.body;

    // Check if email already exists (not current user)
    if (email) {
      const existing = await User.findOne({ 
        email, 
        _id: { $ne: id },
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } }
        ]
      });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const updateData = {
      name,
      phone: phone || '',
      address: address || '',
      ...(status !== undefined && { isTemp: status === 'Inactive' }),
      ...(enrollment !== undefined && { enrollment }),
      ...(enrolledCourses !== undefined && { enrolledCourses }),
      ...(enrolledSubjects !== undefined && { enrolledSubjects }),
    };

    const student = await User.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('name email phone address isTemp createdAt enrollment course');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (enrollment === 'active') {
      try {
        const studentWithCourses = await User.findById(id).populate('enrolledCourses', 'title');
        const courseNames = studentWithCourses.enrolledCourses && studentWithCourses.enrolledCourses.length > 0
          ? studentWithCourses.enrolledCourses.map(c => c.title).join(', ')
          : student.course || 'the selected programs';
        await sendEnrollmentEmail(student.email, student.name, courseNames);
      } catch (e) {
        console.error('Failed to send enrollment email', e);
      }
    }

    res.json({
      message: 'Student updated successfully',
      student: {
        key: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        address: student.address,
        status: student.isTemp ? 'Inactive' : 'Active',
        enrollment: student.enrollment,
        course: student.course
      }
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { updateStudent };

