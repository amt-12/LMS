const DemoClass = require("../../models/Course/DemoClass");

const updateDemoClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const { title, videoUrl, description } = req.body;

    const demoClass = await DemoClass.findByIdAndUpdate(
      id,
      { title, videoUrl, description },
      { new: true, runValidators: true }
    );

    if (!demoClass) {
      return res.status(404).json({ error: 'Demo class not found' });
    }

    res.json({
      message: 'Demo class updated successfully',
      demoClass: {
        _id: demoClass._id,
        title: demoClass.title,
        videoUrl: demoClass.videoUrl,
        description: demoClass.description,
        createdAt: demoClass.createdAt
      }
    });
  } catch (error) {
    console.error('Update demo class error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { updateDemoClass };
