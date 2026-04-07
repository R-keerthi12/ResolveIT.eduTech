/**
 * controllers/statsController.js
 * Thin HTTP layer — delegates to statsService.
 */

const { getSummary } = require('../services/statsService');

function getSummaryHandler(req, res) {
  res.json(getSummary());
}

module.exports = { getSummary: getSummaryHandler };
