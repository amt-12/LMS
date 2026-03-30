const express = require('express');
const multer = require('multer');
const { testS3Connection, uploadToS3 } = require('../../services/s3Service');
const router = express.Router();

// Simple test endpoint
router.get('/test-s3', async (req, res) => {
  try {
    const result = await testS3Connection();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload test with file
const upload = multer({ storage: multer.memoryStorage() });

router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const s3Key = await uploadToS3(
      req.file.buffer, 
      req.file.originalname, 
      req.file.mimetype
    );
    
    res.json({ 
      success: true, 
      s3Key,
      message: 'S3 upload test successful!'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

