/**
 * controllers/grievanceController.js
 * Thin HTTP layer — delegates all logic to grievanceService.
 */

const svc = require('../services/grievanceService');

function sendResult(res, result) {
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.status(result.status || 200).json(result.data);
}

function list(req, res) {
  const result = svc.listGrievances(req.query, req.user);
  res.json(result); // returns { data, total, page, pages, limit }
}

function getOne(req, res) {
  sendResult(res, svc.getGrievanceByID(req.params.id, req.user));
}

function create(req, res) {
  sendResult(res, svc.createGrievance(req.body, req.user));
}

function update(req, res) {
  sendResult(res, svc.updateGrievance(req.params.id, req.body, req.user));
}

function remove(req, res) {
  sendResult(res, svc.deleteGrievance(req.params.id, req.user));
}

module.exports = { list, getOne, create, update, remove };
