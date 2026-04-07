/**
 * middleware/errorHandler.js
 * Express global error-handling middleware.
 * Mount LAST in server.js:  app.use(errorHandler)
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err.stack || err.message);

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
