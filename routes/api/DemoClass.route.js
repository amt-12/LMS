const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { getDemoClasses } = require('../../controller/DemoClass/getDemoClassesController');
const { createDemoClass } = require('../../controller/DemoClass/createDemoClassController');
const { deleteDemoClass } = require('../../controller/DemoClass/deleteDemoClassController');

// Public route to get demo classes
router.get('/', getDemoClasses);

// Admin only routes
router.use(protect);
router.post('/', createDemoClass);
router.delete('/:id', deleteDemoClass);

module.exports = router;
