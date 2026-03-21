const DemoClass = require("../../models/Course/DemoClass");

const deleteDemoClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;
    const demoClass = await DemoClass.findByIdAndDelete(id);

    if (!demoClass) {
      return res.status(404).json({ error: 'Demo class not found' });
    }

    res.json({ message: 'Demo class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting demo class' });
  }
};

module.exports = { deleteDemoClass };
