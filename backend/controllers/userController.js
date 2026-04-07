/**
 * controllers/userController.js
 * Thin HTTP layer — delegates all logic to userService.
 */

const svc = require('../services/userService');

function sendResult(res, result) {
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.status(result.status || 200).json(result.data);
}

function list(req, res)        { sendResult(res, svc.listUsers(req.query.role)); }
function getMe(req, res)       { sendResult(res, svc.getMyProfile(req.user.email)); }
function getOne(req, res)      { sendResult(res, svc.getUserByID(req.params.id)); }
function create(req, res)      { sendResult(res, svc.createUser(req.body, req.user.email)); }
function update(req, res)      { sendResult(res, svc.updateUser(req.params.id, req.body, req.user.email)); }
function remove(req, res)      { sendResult(res, svc.deleteUser(req.params.id, req.user.email)); }

module.exports = { list, getMe, getOne, create, update, remove };
