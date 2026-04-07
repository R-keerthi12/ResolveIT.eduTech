/**
 * controllers/authController.js
 * Thin HTTP layer — delegates all logic to authService.
 */

const svc = require('../services/authService');

function sendResult(res, result) {
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.status(result.status || 200).json(result.data);
}

function login(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  sendResult(res, svc.login(req.body.email, req.body.password, ip));
}

function logout(req, res) {
  sendResult(res, svc.logout(req.headers.authorization));
}

function refresh(req, res) {
  sendResult(res, svc.refreshToken(req.headers.authorization));
}

function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  sendResult(res, svc.changePassword(req.user.email, oldPassword, newPassword));
}

function register(req, res) {
  sendResult(res, svc.register(req.body));
}

module.exports = { login, logout, refresh, changePassword, register };
