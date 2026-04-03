const DemoClass = require("../../models/Course/DemoClass");

const getDemoClasses = async (req, res) => {
  try {
    const demoClasses = await DemoClass.find().sort({ createdAt: -1 });
    res.json({ demoClasses });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching demo classes' });
  }
};

module.exports = { getDemoClasses };
