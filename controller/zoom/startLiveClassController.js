const LiveClass = require('../../models/LiveClass');
const mongoose = require('mongoose');
const Subject = require('../../models/Subject');
const User = require('../../models/Auth/User');
const { sendLiveClassStartEmail } = require('../../services/emailService');

const startLiveClassController = async (req, res) => {
  try {
    const { id: liveClassId } = req.params;

    let liveClass;
    try {
      liveClass = await LiveClass.findById(liveClassId);
    } catch (castError) {
      if (castError.name === 'CastError') {
        liveClass = await LiveClass.findOne({ slug: liveClassId });
      } else {
        throw castError;
      }
    }
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Live class has already been completed'
      });
    }

    const wasNotStarted = liveClass.status === 'not-started';

    if (wasNotStarted) {
      liveClass.status = 'ongoing';
      await liveClass.save();

      // Fire-and-forget: notify enrolled students asynchronously
      (async () => {
        try {
          // Resolve the course through the subject
          const subject = await Subject.findById(liveClass.subjectId).lean();
          if (!subject) return;

          const courseId = subject.courseId;

          // Find all students enrolled in this course
          const enrolledStudents = await User.find({
            role: 'student',
            enrolledCourses: courseId
          }).select('name email').lean();

          if (!enrolledStudents.length) return;

          // Send emails concurrently
          await Promise.all(
            enrolledStudents.map(student =>
              sendLiveClassStartEmail(student.email, student.name, {
                title: liveClass.title,
                joinUrl: liveClass.joinUrl,
                password: liveClass.password,
                startTime: liveClass.startTime
              })
            )
          );
        } catch (emailErr) {
          console.error('Error sending live class start emails:', emailErr.message);
        }
      })();
    }

    res.json({
      success: true,
      data: liveClass,
      message: 'Live class started successfully'
    });
  } catch (error) {
    console.error('Start live class error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { startLiveClassController };
