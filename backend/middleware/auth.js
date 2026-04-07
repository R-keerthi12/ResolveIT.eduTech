/**
 * middleware/auth.js
 *
 * Authentication middleware.
 * Uses authService.decodeToken so blacklisted tokens are rejected.
 */

const { decodeToken } = require('../services/authService');

/**
 * Middleware factory.
 * @param {string[]} [roles]  Allowed roles. Empty = any authenticated user.
 */
function requireAuth(roles = []) {
  return (req, res, next) => {
    const user = decodeToken(req.headers.authorization || '');

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated. Provide a valid Bearer token.' });
    }

    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({
        error: `Forbidden. Requires role: ${roles.join(' | ')}. Your role: ${user.role}`,
      });
    }

    req.user = user;
    next();
  };
}

module.exports = { requireAuth };
