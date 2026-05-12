const axios = require('axios');
const zoomService = require('../../services/zoomService');
const User = require('../../models/Auth/User');

const recordingProxyController = async (req, res) => {
  try {
    // Check if student is blocked from recording access
    const userId = req.user?.userId || req.user?._id;
    if (userId) {
      const user = await User.findById(userId).select('role recordingAccessBlocked');
      if (user && user.role === 'student' && user.recordingAccessBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your recording access has been blocked due to content protection violations. Contact admin.',
        });
      }
    }

    const { video_url } = req.query;

    if (!video_url) {
      return res.status(400).json({ success: false, message: 'video_url query param required' });
    }

    // Get a fresh Zoom OAuth access token
    const accessToken = await zoomService.getAccessToken();

    // Append access_token to the Zoom download URL
    const separator = video_url.includes('?') ? '&' : '?';
    const authenticatedUrl = `${video_url}${separator}access_token=${accessToken}`;

    // For mobile apps, redirecting to the authenticated Zoom URL is much more reliable
    // than proxying the stream. It allows the native player (ExoPlayer/AVPlayer) 
    // to handle the stream directly with all native optimizations.
    console.log(`[Proxy] Redirecting to Zoom authenticated URL for: ${video_url.substring(0, 50)}...`);
    return res.redirect(authenticatedUrl);

  } catch (error) {
    console.error('[Proxy Controller] Error:', error.response?.status, error.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Failed to get authenticated recording URL from Zoom',
        error: error.message,
      });
    }
  }
};

module.exports = { recordingProxyController };

