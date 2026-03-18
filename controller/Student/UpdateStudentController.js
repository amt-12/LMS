const User = require("../../models/Auth/User");

const updateStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const { name, email, phone, address, status } = req.body;

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
    };

    const student = await User.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('name email phone address isTemp createdAt');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
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
      }
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { updateStudent };

