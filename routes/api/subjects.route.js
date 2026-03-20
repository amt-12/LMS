const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getSubjects } = require('../../controller/Subject/getSubjectsController');
const { createSubject } = require('../../controller/Subject/createSubjectController');
const { updateSubject } = require('../../controller/Subject/updateSubjectController');
const { deleteSubject } = require('../../controller/Subject/deleteSubjectController');
const { getSubjectsByCourse } = require('../../controller/Subject/getSubjectsByCourseController');

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getSubjects);
router.get('/:courseId', getSubjectsByCourse);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;

