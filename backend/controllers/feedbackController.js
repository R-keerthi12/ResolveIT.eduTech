/**
 * controllers/feedbackController.js
 * Thin HTTP layer — delegates all logic to feedbackService.
 */

const svc = require('../services/feedbackService');

function sendResult(res, result) {
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.status(result.status || 200).json(result.data);
}

function list(req, res)   { sendResult(res, svc.listFeedback(req.query)); }
function getOne(req, res) { sendResult(res, svc.getFeedbackByID(req.params.id)); }
function create(req, res) { sendResult(res, svc.createFeedback(req.body, req.user)); }
function remove(req, res) { sendResult(res, svc.deleteFeedback(req.params.id, req.user.email)); }

module.exports = { list, getOne, create, remove };
