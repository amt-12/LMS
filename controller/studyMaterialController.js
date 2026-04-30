const StudyMaterial = require('../models/StudyMaterial');
const Course = require('../models/Course');
const { uploadToS3, generateSignedUrl: getSignedUrl, deleteFromS3, testS3Connection } = require('../services/s3Service');

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
    
    if (error.message.includes('AWS') || error.message.includes('S3')) {
      return res.status(500).json({ 
        error: `Upload failed: ${error.message}`,
        s3Error: true 
      });
    }
    
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
      course: material.course ? material.course.title : 'Course not available',
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

    // Auto-detect: students get watermark, others get clean PDF
    const isStudent = req.user?.role === 'student';
    const studentName = req.user?.name || 'Student';

if (isStudent) {
      
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const { PDFDocument, rgb, degrees } = require('pdf-lib');
      
      // Use S3 service for getting PDF - ensures proper auth
      const { generateSignedUrl } = require('../services/s3Service');
      
      // Get PDF directly from S3 using the service's client
      const { getStreamBuffer } = require('../services/s3Service');
      const pdfBuffer = await getStreamBuffer(material.s3Key);

      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const helveticaFont = await pdfDoc.embedFont('Helvetica');

      // Watermark each page - Bottom-left → diagonal → top-right (45° ✓)
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const watermarkText = `Student: ${studentName}`;
        const fontSize = 45;
        
        // 1️⃣ Main diagonal: Bottom-left origin → top-right direction
        page.drawText(watermarkText, {
          x: 50,
          y: height - 50,  // Bottom-left start
          size: fontSize,
          angle: degrees(45),  // Diagonal up-right
          color: rgb(0.7, 0.7, 0.7),
        });
        
        // 2️⃣ Secondary coverage
        page.drawText(watermarkText, {
          x: width - 250,
          y: 80,
          size: fontSize,
          angle: degrees(45),
          color: rgb(0.8, 0.8, 0.8),
        });
        
        // 3️⃣ Center reinforcement 
        page.drawText(watermarkText, {
          x: width / 2 - 120,
          y: height / 2,
          size: fontSize * 0.85,
          angle: degrees(45),
          color: rgb(0.75, 0.75, 0.75),
        });
      });

      // Stream watermarked PDF
      const watermarkedPdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${material.fileName.replace('.pdf', '_watermarked.pdf')}"`);
      res.send(watermarkedPdfBytes);
    } else {
      // 🚫 Non-students: Clean original PDF via signed S3 URL
      const { generateSignedUrl } = require('../services/s3Service');
      const signedUrl = await generateSignedUrl(material.s3Key);
      res.json({ downloadUrl: signedUrl });
    }
  } catch (error) {
    console.error('Get download URL error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

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
    if (error.message.includes('S3')) {
      return res.status(500).json({ error: `Delete failed: ${error.message}` });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const testS3 = async (req, res) => {
  try {
    const result = await testS3Connection();
    if (result.success) {
      res.json({ 
        message: 'S3 connection healthy',
        bucket: result.bucket 
      });
    } else {
      res.status(500).json({ 
        error: 'S3 connection failed',
        details: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  getDownloadUrl,
  deleteMaterial,
  testS3
};
