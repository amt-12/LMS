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

    // We must handle redirects manually to preserve the 'Range' header
    // Axios (and most clients) strip 'Range' and 'Authorization' when following redirects to a different domain
    let currentUrl = authenticatedUrl;
    let zoomRes;
    let redirects = 0;

    while (redirects < 10) {
      zoomRes = await axios.get(currentUrl, {
        responseType: 'stream',
        headers: {
          ...headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 0, // Handle manually
        validateStatus: (status) => (status >= 200 && status < 400),
        timeout: 60000,
      });

      if (zoomRes.status >= 300 && zoomRes.status < 400 && zoomRes.headers.location) {
        currentUrl = zoomRes.headers.location;
        redirects++;
        // Resume stream for next hop
        zoomRes.data.destroy();
      } else {
        break;
      }
    }

    // Forward relevant response headers with FORCED video/mp4 content type
    // This is crucial for Android devices that fail to decode application/octet-stream
    const responseHeaders = {
      'Content-Type': 'video/mp4',
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
