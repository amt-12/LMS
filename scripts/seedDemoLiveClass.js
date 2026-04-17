const connectDB = require('../config/db');
const LiveClass = require('../models/LiveClass');
const Subject = require('../models/Subject');
const User = require('../models/Auth/User');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function seedDemo() {
  try {
    await connectDB();
    console.log('✅ Connected to DB');

    const demoSlug = 'demo';

    // Clean up existing demo first
    const existingLiveClass = await LiveClass.findOne({ slug: demoSlug });
    if (existingLiveClass) {
      await LiveClass.findByIdAndDelete(existingLiveClass._id);
      console.log('🗑️  Deleted existing demo LiveClass');
    }

    const existingSubject = await Subject.findOne({ title: 'Demo Subject' });
    const existingUser = await User.findOne({ name: 'Demo Teacher' });

    let demoSubjectId, demoUserId;

    // Create minimal Subject if not exists
    if (!existingSubject) {
      console.log('📚 Creating Demo Subject...');
      const demoSubject = new Subject({
        title: 'Demo Subject',
        slug: 'demo-subject',
        courseId: new mongoose.Types.ObjectId() // dummy courseId, populate will handle null
      });
      await demoSubject.save();
      demoSubjectId = demoSubject._id;
      console.log('✅ Demo Subject created:', demoSubjectId);
    } else {
      demoSubjectId = existingSubject._id;
      console.log('✅ Using existing Demo Subject:', demoSubjectId);
    }

    // Create minimal User (teacher) if not exists
    if (!existingUser) {
      console.log('👤 Creating Demo Teacher...');
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
      console.log('✅ Demo Teacher created:', demoUserId);
    } else {
      demoUserId = existingUser._id;
      console.log('✅ Using existing Demo Teacher:', demoUserId);
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
    console.log('🎉 Demo LiveClass created successfully!');
    console.log('📋 ID:', demoClass._id);
    console.log('🔗 Test it:');
    console.log(`   curl http://localhost:5001/api/live-classes/demo`);
    console.log('');
    console.log('✅ SEED COMPLETE - Restart server and test frontend Dashboard!');

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
