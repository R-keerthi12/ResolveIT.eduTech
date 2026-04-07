/**
 * middleware/requestLogger.js
 *
 * Logs every inbound HTTP request with method, path, status, duration, and IP.
 * Format:  [2025-01-10 14:23:01] POST /api/auth/login 200 12ms  ::1
 *
 * Sensitive routes (login, register) have their body omitted from logs.
 */

const SENSITIVE = ['/api/auth/login', '/api/auth/register', '/api/auth/change-password'];

function requestLogger(req, res, next) {
  const start = Date.now();
  const ip    = req.ip || req.connection?.remoteAddress || '?';

  res.on('finish', () => {
    const ms      = Date.now() - start;
    const ts      = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const status  = res.statusCode;
    const color   = status >= 500 ? '\x1b[31m'   // red
                  : status >= 400 ? '\x1b[33m'   // yellow
                  : status >= 300 ? '\x1b[36m'   // cyan
                  : '\x1b[32m';                  // green
    const reset   = '\x1b[0m';
    console.log(`${color}[${ts}] ${req.method} ${req.path} ${status} ${ms}ms  ${ip}${reset}`);
  });

  next();
}

module.exports = requestLogger;
