const DemoClass = require("../../models/Course/DemoClass");

const createDemoClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { title, videoUrl, description } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ error: 'Title and videoUrl are required' });
    }

    const demoClass = new DemoClass({
      title,
      videoUrl,
      description
    });

    await demoClass.save();

    res.status(201).json({
      message: 'Demo class created successfully',
      demoClass
    });
  } catch (error) {
    console.error('Create demo class error:', error);
    res.status(500).json({ error: 'Server error creating demo class' });
  }
};

module.exports = { createDemoClass };
