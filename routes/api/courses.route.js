const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getCourses } = require('../../controller/Course/getCoursesController');
const { getPublicCourses } = require('../../controller/Course/getPublicCoursesController');
const { createCourse } = require('../../controller/Course/createCourseController');
const { updateCourse } = require('../../controller/Course/updateCourseController');
const { deleteCourse } = require('../../controller/Course/deleteCourseController');

const router = express.Router();

router.get('/public', getPublicCourses);
router.get('/', getCourses);

router.use(protect); // All routes below require auth

router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

module.exports = router;
