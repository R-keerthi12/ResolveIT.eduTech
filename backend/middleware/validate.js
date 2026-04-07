/**
 * middleware/validate.js
 * Lightweight request validation helpers.
 *
 * Usage:
 *   router.post('/grievances', requireFields(['subject','dept','desc']), handler);
 */

/**
 * Returns middleware that rejects requests missing any of the listed body fields.
 * @param {string[]} fields
 */
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (missing.length) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Middleware that trims all string values in req.body.
 */
function trimBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(k => {
      if (typeof req.body[k] === 'string') req.body[k] = req.body[k].trim();
    });
  }
  next();
}

module.exports = { requireFields, trimBody };
