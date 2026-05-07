const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 5 attempts per IP
  message: 'Too many login attempts. Try after 15 min.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many login attempts. Try after 15 min.' });
  }
});

module.exports = { loginLimiter };
