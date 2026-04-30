const connectDB = require('../config/db');
const LiveClass = require('../models/LiveClass');
const Subject = require('../models/Subject');
const User = require('../models/Auth/User');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function seedDemo() {
  try {
    await connectDB();

    const demoSlug = 'demo';

    // Clean up existing demo first
    const existingLiveClass = await LiveClass.findOne({ slug: demoSlug });
    if (existingLiveClass) {
      await LiveClass.findByIdAndDelete(existingLiveClass._id);
    }

    const existingSubject = await Subject.findOne({ title: 'Demo Subject' });
    const existingUser = await User.findOne({ name: 'Demo Teacher' });

    let demoSubjectId, demoUserId;

    // Create minimal Subject if not exists
    if (!existingSubject) {
      const demoSubject = new Subject({
        title: 'Demo Subject',
        slug: 'demo-subject',
        courseId: new mongoose.Types.ObjectId() // dummy courseId, populate will handle null
      });
      await demoSubject.save();
      demoSubjectId = demoSubject._id;
    } else {
      demoSubjectId = existingSubject._id;
    }

    // Create minimal User (teacher) if not exists
    if (!existingUser) {
      const demoUser = new User({
        name: 'Demo Teacher',
        email: 'demo@teacher.com',
        role: 'teacher',
        phone: '9999999999',
        enrollment: 'active',
        isVerified: true,
        password: 'hasheddemo' // won't validate on seed
      });
      await demoUser.save();
      demoUserId = demoUser._id;
    } else {
      demoUserId = existingUser._id;
    }

    // Now create LiveClass with VALID references
    const demoClass = new LiveClass({
      title: '🎬 Demo Live Class - Join to test LMS features',
      slug: demoSlug,
      subjectId: demoSubjectId,
      zoomMeetingId: 'demo123456789',
      joinUrl: 'https://zoom.us/j/demo123456789?pwd=mockpass123',
      password: 'demo123',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      duration: 60,
      status: 'not-started',
      createdBy: demoUserId
    });

    await demoClass.save();

  } catch (error) {
    console.error('❌ Seed ERROR:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seedDemo();
