const Subject = require('../../models/Subject');

const deleteSubject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await Subject.deleteOne({ _id: id });

    res.json({ 
      message: 'Subject deleted successfully' 
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { deleteSubject };

