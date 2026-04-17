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

  console.log('🔑 Auth:', req.cookies?.token ? 'cookie' : 'Bearer header');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check cache first
    // const cachedUser = await getCachedUser(decoded.userId);
    // if (cachedUser) {
    //   req.user = cachedUser;
    //   return next();
    // }
    
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
