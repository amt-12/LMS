const User = require("../../models/Auth/User");
const s3Service = require("../../services/s3Service");
const path = require("path");
const { unlinkSync } = require("fs");

// Get Profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId)
      .populate("enrolledCourses", "title description")
.select(
        "name email phone address profileImage role status enrollment isTemp course createdAt enrolledCourses"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Don't return if soft-deleted
    if (user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileImageUrl = user.profileImage
      ? await s3Service.generateSignedUrl(user.profileImage)
      : null;
    res.json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        profileImage: profileImageUrl,
        role: user.role,
        status:
          user.enrollment === "active"
            ? "active"
            : user.isTemp
            ? "inactive"
            : user.status,
        enrollment: user.enrollment || "inactive",
        course: user.course,
        enrolledCourses: user.enrolledCourses || [],
        joined: user.createdAt,
      },
    });
    console.log(profileImageUrl,"profileImageUrl")
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Server error fetching profile" });
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
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
}).select("name email phone address profileImage role status enrollment isTemp course");

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
        status:
          user.enrollment === "active"
            ? "active"
            : user.isTemp
            ? "inactive"
            : user.status,
        enrollment: user.enrollment || "inactive",
        course: user.course,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Server error updating profile" });
  }
};

// Delete Profile
const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findByIdAndUpdate(userId, {
      deletedAt: new Date(),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ error: "Server error deleting profile" });
  }
};

// Upload Profile Image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const file = req.file;
    const userId = req.user.userId || req.user._id;

    // Validate file type and size (5MB max)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      unlinkSync(file.path);
      return res
        .status(400)
        .json({ error: "Invalid file type. Only JPEG/PNG allowed" });
    }

    if (file.size > maxSize) {
      unlinkSync(file.path);
      return res.status(400).json({ error: "File too large. Max 5MB" });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      unlinkSync(file.path);
      return res.status(404).json({ error: "User not found" });
    }

    // Delete old image if exists
    if (user.profileImage) {
      await s3Service.deleteFromS3(user.profileImage).catch(console.error);
    }

    // Upload new image to profiles/ prefix
    const fileName = `${userId}-${Date.now()}-${
      path.parse(file.originalname).name
    }${path.parse(file.originalname).ext}`;
    const s3Key = `profiles/${fileName}`;
    await s3Service.uploadToS3(file.buffer, fileName, file.mimetype, s3Key);

    // Update user
    user.profileImage = s3Key;
    await user.save();

    const profileImageUrl = await s3Service.generateSignedUrl(s3Key);

    res.json({
      message: "Profile image uploaded successfully",
      profile: {
        ...(res.locals.profileData || {}), // Reuse if available
        profileImage: profileImageUrl,
      },
    });
  } catch (error) {
    console.error("🚫 Backend Upload FAILED:", {
      message: error.message,
      code: error.code,
      userId: req.user?.userId,
      file: req.file
        ? {
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname,
          }
        : null,
      stack: error.stack,
    });
    res.status(500).json({ error: "Server error uploading image" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  uploadProfileImage,
};
