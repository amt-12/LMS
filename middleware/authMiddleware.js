const jwt = require("jsonwebtoken");
const { getCachedUser } = require("../cache");

const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: "Not authorized"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check cache first
    const cachedUser = await getCachedUser(decoded.userId);
    if (cachedUser) {
      req.user = cachedUser;
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
