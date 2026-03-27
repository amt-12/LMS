const StudyMaterial = require('../models/StudyMaterial');
const Course = require('../models/Course');
const { uploadToS3, generateSignedUrl: getSignedUrl, deleteFromS3 } = require('../services/s3Service');

const uploadMaterial = async (req, res) => {
  try {
    const { title, course } = req.body;
    const file = req.file;

    if (!title || !course || !file) {
      return res.status(400).json({ error: 'Title, course, and file are required' });
    }

    // Validate course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Validate PDF only
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Upload to S3
    const s3Key = await uploadToS3(file.buffer, file.originalname, file.mimetype);

    // Save metadata
    const material = new StudyMaterial({
      title: title.trim(),
      course,
      fileName: file.originalname,
      s3Key,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    const savedMaterial = await material.save();

    // Populate course
    const populated = await StudyMaterial.findById(savedMaterial._id).populate('course', 'title');

    res.status(201).json({
      message: 'Material uploaded successfully',
      material: {
        key: savedMaterial._id,
        title: savedMaterial.title,
        course: populated.course.title,
        fileName: savedMaterial.fileName,
        fileSize: (savedMaterial.fileSize / 1024 / 1024).toFixed(1) + ' MB',
        uploaded: new Date(savedMaterial.createdAt).toLocaleDateString()
      }
    });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
};

const getMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 10, courseId, search } = req.query;
    const query = {};

    if (courseId) query.course = courseId;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const total = await StudyMaterial.countDocuments(query);

    const materials = await StudyMaterial.find(query)
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const materialsList = materials.map(material => ({
      key: material._id,
      title: material.title,
      course: material.course.title,
      fileName: material.fileName,
      fileSize: (material.fileSize / 1024 / 1024).toFixed(1) + ' MB',
      uploaded: new Date(material.createdAt).toLocaleDateString()
    }));

    res.json({
      materials: materialsList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await StudyMaterial.findById(id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const signedUrl = await getSignedUrl(material.s3Key);
    res.json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Get download URL error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await StudyMaterial.findById(id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Delete from S3
    await deleteFromS3(material.s3Key);

    // Delete from DB
    await StudyMaterial.findByIdAndDelete(id);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  getDownloadUrl,
  deleteMaterial
};
