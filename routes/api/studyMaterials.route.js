const express = require('express');
const multer = require('multer');
const { protect } = require('../../middleware/authMiddleware');
const { uploadMaterial, getMaterials, getDownloadUrl, deleteMaterial, testS3Connection } = require('../../controller/studyMaterialController');

const router = express.Router();

// Multer config - memory storage for S3 upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  }
});

router.post('/', protect, upload.single('file'), uploadMaterial);
router.get('/', protect, getMaterials);
router.get('/:id/download', protect, getDownloadUrl);
router.delete('/:id', protect, deleteMaterial);

module.exports = router;
