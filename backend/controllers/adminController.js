/**
 * controllers/adminController.js
 * Thin HTTP layer — delegates all logic to adminService / authService.
 */

const adminSvc = require('../services/adminService');
const authSvc  = require('../services/authService');

function sendResult(res, result) {
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.status(result.status || 200).json(result.data);
}

function getDashboard(req, res)      { sendResult(res, adminSvc.getDashboard()); }
function getWorkload(req, res)       { sendResult(res, adminSvc.getResolverWorkload()); }
function getDbHealth(req, res)       { sendResult(res, adminSvc.getDbHealth()); }
function createBackup(req, res)      { sendResult(res, adminSvc.createBackup(req.user.email)); }

function restoreBackup(req, res) {
  sendResult(res, adminSvc.restoreBackup(req.body, req.user.email));
}

function bulkUpdate(req, res) {
  const { ids, status, remarks } = req.body;
  sendResult(res, adminSvc.bulkUpdateStatus(ids, status, remarks, req.user));
}

function exportCSV(req, res) {
  const result = adminSvc.exportGrievancesCSV(req.query);
  if (result.error) return res.status(result.status || 500).json({ error: result.error });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="grievances-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(result.data);
}

function purgeResolved(req, res) {
  const { days } = req.body;
  sendResult(res, adminSvc.purgeResolved(days, req.user.email));
}

function resetPassword(req, res) {
  const { newPassword } = req.body;
  sendResult(res, authSvc.adminResetPassword(req.params.id, newPassword, req.user.email));
}

module.exports = {
  getDashboard, getWorkload, getDbHealth,
  createBackup, restoreBackup,
  bulkUpdate, exportCSV, purgeResolved, resetPassword,
};
