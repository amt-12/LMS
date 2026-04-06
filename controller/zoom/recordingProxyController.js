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

    console.log(`[Proxy] Streaming: ${video_url.substring(0, 80)}...`);

    // Get a fresh Zoom OAuth access token
    const accessToken = await zoomService.getAccessToken();

    // Append access_token to the Zoom download URL
    const separator = video_url.includes('?') ? '&' : '?';
    const authenticatedUrl = `${video_url}${separator}access_token=${accessToken}`;

    // Build request headers
    const headers = {};
    if (req.headers['range']) {
      headers['Range'] = req.headers['range'];
    }

    // Use axios streaming — it follows redirects automatically
    const zoomRes = await axios.get(authenticatedUrl, {
      responseType: 'stream',
      headers,
      maxRedirects: 5,
      timeout: 30000, // 30s timeout for large files
    });

    console.log('[Proxy] Zoom response:', zoomRes.status,
      'content-length:', zoomRes.headers['content-length'] || 'unknown',
      'content-type:', zoomRes.headers['content-type']
    );

    // Forward relevant response headers
    const responseHeaders = {
      'Content-Type': zoomRes.headers['content-type'] || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    if (zoomRes.headers['content-length']) {
      responseHeaders['Content-Length'] = zoomRes.headers['content-length'];
    }
    if (zoomRes.headers['content-range']) {
      responseHeaders['Content-Range'] = zoomRes.headers['content-range'];
    }

    res.writeHead(zoomRes.status, responseHeaders);

    // Pipe the video stream to the client
    zoomRes.data.pipe(res);

    zoomRes.data.on('error', (err) => {
      console.error('[Proxy] Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Stream error' });
      }
    });

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

