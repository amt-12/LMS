const User = require("../../models/Auth/User");
const deleteStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;

    const student = await User.findByIdAndDelete(
      id,
      { deletedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { deleteStudent };

