const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Strict JWT Verification Middleware
 * Validates token against JWT_SECRET and rejects unauthenticated/invalid requests with 401.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Malformed token. Bearer scheme required.' });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Empty authentication token.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

module.exports = { verifyToken };
