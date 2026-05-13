const jwt = require("jsonwebtoken");
const { getCachedUser } = require("../middleware/cache");

const protect = async (req, res, next) => {
// Extract token from cookie (web), Bearer header (mobile app), or query param (video proxy)
  let token = req.cookies?.token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Fallback: query param (used by <video src="...?token=xxx"> for proxy streaming)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      message: "Not authorized - no token provided"
    });
  }


  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach minimal user info to req.user for controllers.
    // Enforce single active session per user.
    if (decoded?.userId) {
      const User = require('../models/Auth/User');
      const dbUser = await User.findById(decoded.userId).select('activeSessionId role status enrollment').lean();

      if (!dbUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Single-login enforcement removed (prevents false 'logged in on another device' issues)
      // Previous logic: if token sessionId doesn't match DB activeSessionId => kick


      if (!dbUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = {
        ...decoded,
        role: dbUser.role,
        status: dbUser.status,
        enrollment: dbUser.enrollment,
      };
      return next();
    }

    // Cache miss - will be populated by controller/service if needed
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalid"
    });
  }
};

module.exports = { protect };
