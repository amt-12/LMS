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

    // Build request headers - forward Range for seeking
    const headers = {};
    if (req.headers['range']) {
      headers['Range'] = req.headers['range'];
    }

    // We must handle redirects manually to find the final S3/CDN URL
    let currentUrl = authenticatedUrl;
    let zoomRes;
    let redirects = 0;

    console.log(`[Proxy] Initial Request URL: ${video_url}`);
    
    while (redirects < 10) {
      console.log(`[Proxy] Fetching (Redirect ${redirects}): ${currentUrl}`);
      zoomRes = await axios.get(currentUrl, {
        responseType: 'stream',
        headers: {
          ...headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 0, // Handle manually
        validateStatus: (status) => status >= 200 && status < 500,
        timeout: 60000,
      });

      console.log(`[Proxy] Zoom Response Status: ${zoomRes.status}, Location: ${zoomRes.headers.location}`);

      // Follow redirects manually to find the final S3/CDN URL
      if (zoomRes.status >= 300 && zoomRes.status < 400 && zoomRes.headers.location) {
        currentUrl = zoomRes.headers.location;
        redirects++;
        zoomRes.data.destroy();
        continue;
      }

      // Reached the final URL
      console.log(`[Proxy] Final URL reached after ${redirects} redirects. Content-Type: ${zoomRes.headers['content-type']}`);
      zoomRes.data.destroy();
      break;
    }

    if (zoomRes.status >= 400) {
      return res.status(502).json({
        success: false,
        message: 'Failed to resolve video URL from Zoom',
        zoomStatus: zoomRes.status,
      });
    }

    // Redirect the client directly to the final S3/CDN media URL.
    // This allows Android ExoPlayer to directly fetch from S3, which perfectly
    // handles Range requests, Content-Length, and chunking natively.
    // This prevents the 'c2.android.avc.decoder' crash caused by Node.js stream proxying.
    return res.redirect(302, currentUrl);

  } catch (error) {
    console.error('[Proxy Controller] Error:', error.response?.status, error.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Failed to stream video from Zoom',
        error: error.message,
      });
    }
  }
};

module.exports = { recordingProxyController };
