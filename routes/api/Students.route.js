const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { addStudent } = require('../../controller/Student/AddStudentController');
const { getStudents } = require('../../controller/Student/GetStudentsController');
const { updateStudent } = require('../../controller/Student/UpdateStudentController');
const { deleteStudent } = require('../../controller/Student/DeleteStudentController');

router.post('/add', protect, addStudent);
router.get('/list', protect, getStudents);
router.put('/:id', protect, updateStudent);
router.delete('/:id', protect, deleteStudent);

module.exports = router;
