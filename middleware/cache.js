const NodeCache = require('node-cache');
const User = require('../models/Auth/User');

const userCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes cache TTL
  checkperiod: 120, // Check cache every 2 min
  useClones: true 
});

// Cache user by ID (for protected routes)
const getCachedUser = (userId) => {
  return userCache.get(`user:${userId}`);
};

// Cache recent users by email for duplicate/exist checks (TTL 5min)
const recentUsersCacheKey = 'recentUsers';
const getCachedModel = (email) => {
  const recentUsers = userCache.get(recentUsersCacheKey) || {};
  return recentUsers[email] ? { ...recentUsers[email] } : null;
};

const setCachedModel = (email, userData) => {
  const recentUsers = userCache.get(recentUsersCacheKey) || {};
  recentUsers[email] = { ...userData };
  userCache.set(recentUsersCacheKey, recentUsers, 300); // 5 min TTL
};

const setCachedUser = (userId, userData) => {
  userCache.set(`user:${userId}`, userData);
};

// Invalidate user cache (on password change, etc.)
const invalidateUserCache = (userId) => {
  userCache.del(`user:${userId}`);
};

module.exports = {
  userCache,
  getCachedUser,
  getCachedModel,
  setCachedModel,
  setCachedUser,
  invalidateUserCache,
  getCacheTtl: (key) => userCache.getTtl(key),
  delCache: (key) => userCache.del(key)
};
