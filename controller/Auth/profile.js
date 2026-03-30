const User = require("../../models/Auth/User");

// Get Profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId)
      .populate('enrolledCourses', 'title description')
      .select('name email phone address role status enrollment isTemp course createdAt enrolledCourses')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return if soft-deleted
    if (user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        status: user.isTemp ? 'inactive' : user.status,
        enrollment: user.enrollment || 'inactive',
        course: user.course,
        enrolledCourses: user.enrolledCourses || [],
        joined: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    // Only allow updating non-sensitive personal info by the student
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const userId = req.user.userId || req.user._id;
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('name email phone address role status enrollment isTemp course');

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        status: user.isTemp ? 'inactive' : user.status,
        enrollment: user.enrollment || 'inactive',
        course: user.course
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

// Delete Profile
const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { deletedAt: new Date() }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Server error deleting profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile
};
