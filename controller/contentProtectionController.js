const User = require('../models/Auth/User');

/**
 * POST /api/content-protection/violation
 * Called by frontend when a student attempts to screenshot/screen-record/download.
 * Increments violation count; blocks recording access after 3 strikes.
 */
const reportViolation = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { type } = req.body; // e.g. 'screenshot', 'screen_record', 'devtools', 'download'

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'student') return res.status(403).json({ success: false, message: 'Not applicable for non-students' });

    user.contentViolations = (user.contentViolations || 0) + 1;
    user.lastViolationAt = new Date();

    if (user.contentViolations >= 3) {
      user.recordingAccessBlocked = true;
    }

    await user.save();

    console.log(`[ContentProtection] Violation #${user.contentViolations} for ${user.email} (type: ${type || 'unknown'})`);

    res.json({
      success: true,
      violations: user.contentViolations,
      blocked: user.recordingAccessBlocked,
      remaining: Math.max(0, 3 - user.contentViolations),
    });
  } catch (error) {
    console.error('[ContentProtection] reportViolation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/content-protection/status
 * Returns current violation count and blocked status for the logged-in student.
 */
const getProtectionStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('contentViolations recordingAccessBlocked lastViolationAt role');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      violations: user.contentViolations || 0,
      blocked: user.recordingAccessBlocked || false,
      remaining: Math.max(0, 3 - (user.contentViolations || 0)),
      lastViolationAt: user.lastViolationAt,
    });
  } catch (error) {
    console.error('[ContentProtection] getStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/content-protection/unblock/:id
 * Admin-only: Reset violations and unblock a student.
 */
const unblockStudent = async (req, res) => {
  try {
    const adminId = req.user.userId || req.user._id;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.contentViolations = 0;
    student.recordingAccessBlocked = false;
    student.lastViolationAt = null;
    await student.save();

    console.log(`[ContentProtection] Admin ${admin.email} unblocked student ${student.email}`);

    res.json({ success: true, message: `${student.name} has been unblocked` });
  } catch (error) {
    console.error('[ContentProtection] unblock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { reportViolation, getProtectionStatus, unblockStudent };
