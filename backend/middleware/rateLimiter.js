/**
 * middleware/rateLimiter.js
 *
 * In-memory sliding-window rate limiter.
 * No external dependencies — works out of the box.
 *
 * Usage:
 *   const { rateLimiter } = require('./rateLimiter');
 *
 *   // Allow 5 requests per 60 seconds per IP on this route
 *   router.post('/login', rateLimiter(5, 60), handler);
 *
 *   // Global limiter: 100 req / min
 *   app.use(rateLimiter(100, 60));
 */

// Store: Map<ip → number[]>  (array of request timestamps)
const store = new Map();

/**
 * @param {number} maxRequests   Max allowed requests in the window
 * @param {number} windowSeconds Time window in seconds
 * @param {string} [message]     Custom error message
 */
function rateLimiter(maxRequests = 100, windowSeconds = 60, message) {
  const windowMs = windowSeconds * 1000;

  return (req, res, next) => {
    const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or initialise timestamps for this IP
    let timestamps = store.get(ip) || [];

    // Drop timestamps outside the current window
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      const oldest   = Math.min(...timestamps);
      const resetIn  = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('X-RateLimit-Limit',     maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset',     resetIn);
      return res.status(429).json({
        error:   message || `Too many requests. Try again in ${resetIn} second(s).`,
        retryIn: resetIn,
      });
    }

    timestamps.push(now);
    store.set(ip, timestamps);

    res.setHeader('X-RateLimit-Limit',     maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - timestamps.length);

    next();
  };
}

/**
 * Strict limiter preset for authentication endpoints (5 req / min).
 */
const authLimiter = rateLimiter(20, 60, 'Too many authentication attempts. Try again in a minute.');

/**
 * Standard API limiter (120 req / min per IP).
 */
const apiLimiter = rateLimiter(120, 60);

module.exports = { rateLimiter, authLimiter, apiLimiter };
