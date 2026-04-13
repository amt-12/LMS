const User = require("../../models/Auth/User");
const { sendEnrollmentEmail, sendUnenrollmentEmail } = require("../../services/emailService");

const updateStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
const { name, email, phone, address, status, enrollment, enrolledCourses, enrolledSubjects, batch } = req.body;

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
      ...(batch !== undefined && { batch }),
      
      // Sync isTemp with enrollment
      ...(enrollment !== undefined && { 
        enrollment,
        isTemp: enrollment === 'inactive'
      }),
      
      ...(enrolledCourses !== undefined && { enrolledCourses }),
      ...(enrolledSubjects !== undefined && { enrolledSubjects }),
    };

    // Fetch original enrollment status before update
    const originalStudent = await User.findById(id).select('enrollment enrolledCourses enrolledSubjects');
    if (!originalStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = await User.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('name email phone address batch isTemp createdAt enrollment course enrolledCourses enrolledSubjects');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if enrollment status changed
    if (originalStudent.enrollment !== student.enrollment) {
      try {
        // Populate enrolled courses/subjects for email
        const studentWithCourses = await User.findById(id).populate('enrolledCourses', 'title').populate('enrolledSubjects', 'title');
        const courseNames = studentWithCourses.enrolledCourses?.map(c => c.title).join(', ') || '';
        const subjectNames = studentWithCourses.enrolledSubjects?.map(s => s.title).join(', ') || '';
        const fullCourseInfo = courseNames || subjectNames || student.course || 'your program(s)';

        if (student.enrollment === 'active') {
          await sendEnrollmentEmail(student.email, student.name, fullCourseInfo);
          console.log(`Enrollment activation email sent to ${student.email}`);
        } else if (student.enrollment === 'inactive') {
          await sendUnenrollmentEmail(student.email, student.name, fullCourseInfo);
          console.log(`Unenrollment notice email sent to ${student.email}`);
        }
      } catch (e) {
        console.error('Failed to send enrollment/unenrollment email:', e);
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
        batch: student.batch,
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

