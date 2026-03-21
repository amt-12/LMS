const User = require("../../models/Auth/User");

const getStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const students = await User.find({ 
      role: 'student',
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
      ]
    })
      .populate('enrolledCourses', 'title')
      .populate('enrolledSubjects', 'title')
      .select('name email phone address isTemp createdAt enrollment course enrolledCourses enrolledSubjects')
      .lean()
      .sort({ createdAt: -1 });

    // Map to frontend format
    const studentList = students.map(student => ({
      key: student._id,
      name: student.name,
      role: student.role,
      email: student.email,
      phone: student.phone,
      address: student.address,
      status: student.isTemp ? 'Inactive' : 'Active',
      enrollment: student.enrollment || 'inactive',
      course: student.course,
      enrolledCourses: student.enrolledCourses ? student.enrolledCourses.map(c => c.title) : [],
      enrolledSubjects: student.enrolledSubjects ? student.enrolledSubjects.map(s => s.title) : [],
      joined: new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      courses: 0,
      lectures: 0,
    }));

    res.json({ students: studentList });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getStudents };

