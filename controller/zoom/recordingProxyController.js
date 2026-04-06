const https = require('https');
const url = require('url');

const recordingProxyController = async (req, res) => {
  console.log('[Proxy] Request headers:', Object.keys(req.headers).slice(0,5).join(', '));
  console.log('[Proxy] video_url param:', !!req.query.video_url ? 'present' : 'MISSING');
  try {
    const { video_url } = req.query;
    
    if (!video_url) {
      return res.status(400).json({ success: false, message: 'video_url query param required' });
    }

    console.log(`[Proxy] Streaming: ${video_url.substring(0, 50)}...`);

    // Parse URL for headers
    const parsedUrl = new URL(video_url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 5000, // 5s timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        ...req.headers['range'] ? { 'Range': req.headers['range'] } : {},
      }
    };

    https.get(options, (zoomRes) => {
      console.log('[Proxy] Zoom response:', zoomRes.statusCode, 
        'content-length:', zoomRes.headers['content-length'] || 'undefined',
        'content-type:', zoomRes.headers['content-type'],
        'transfer-encoding:', zoomRes.headers['transfer-encoding']
      );
      
      // Dynamic headers from Zoom response - FIXED content-length handling
      const headers = {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        ...zoomRes.headers // Forward ALL headers including content-length
      };
      
      // Remove ONLY hop-by-hop headers
      const hopByHop = ['connection', 'keep-alive', 'proxy-authenticate', 
                        'proxy-authorization', 'te', 'trailers', 'upgrade'];
      hopByHop.forEach(h => delete headers[h]);
      
      // Ensure video Content-Type
      headers['Content-Type'] = zoomRes.headers['content-type'] || 'video/mp4';
      
      // SUPPORT CHUNKED TRANSFER (for dynamic content-length: undefined)
      if (zoomRes.headers['transfer-encoding'] === 'chunked' || 
          !zoomRes.headers['content-length']) {
        headers['Transfer-Encoding'] = 'chunked';
        console.log('[Proxy] Using chunked transfer encoding');
      }
      
      res.writeHead(zoomRes.statusCode, headers);
      
      zoomRes.pipe(res);

      zoomRes.on('error', (err) => {
        console.error('[Proxy] Zoom response error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Stream error' });
        }
      });

    }).on('error', (err) => {
      console.error('[Proxy] HTTPS get error:', err);
      res.status(502).json({ success: false, message: 'Failed to fetch video from Zoom' });
    });

  } catch (error) {
    console.error('[Proxy Controller] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordingProxyController };

