/**
 * middleware/respond.js
 *
 * Attaches res.ok() and res.fail() helpers for a consistent API envelope.
 *
 * Success shape:
 * {
 *   "success": true,
 *   "data": { ... } | [ ... ],
 *   "meta": { "total": 12, "page": 1, "pages": 3 }  // optional
 * }
 *
 * Error shape:
 * {
 *   "success": false,
 *   "error": "Human-readable message",
 *   "code": "OPTIONAL_MACHINE_CODE"
 * }
 */

function respond(req, res, next) {
  /**
   * Send a successful response.
   * @param {*}      data
   * @param {number} [status=200]
   * @param {object} [meta]
   */
  res.ok = function (data, status = 200, meta = null) {
    const body = { success: true, data };
    if (meta) body.meta = meta;
    return res.status(status).json(body);
  };

  /**
   * Send an error response.
   * @param {string} message
   * @param {number} [status=400]
   * @param {string} [code]
   */
  res.fail = function (message, status = 400, code = null) {
    const body = { success: false, error: message };
    if (code) body.code = code;
    return res.status(status).json(body);
  };

  next();
}

module.exports = respond;
