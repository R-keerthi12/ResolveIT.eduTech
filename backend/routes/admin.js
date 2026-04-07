/**
 * routes/admin.js
 * /api/admin  — all endpoints require admin role
 *
 * GET    /api/admin/dashboard         Full aggregate dashboard
 * GET    /api/admin/workload          Resolver workload report
 * GET    /api/admin/db/health         DB file sizes & record counts
 * GET    /api/admin/db/backup         Download full data snapshot (JSON)
 * POST   /api/admin/db/restore        Restore grievances+feedback from snapshot
 * POST   /api/admin/grievances/bulk   Bulk-update grievance statuses
 * GET    /api/admin/export/csv        Export grievances as CSV
 * DELETE /api/admin/grievances/purge  Hard-delete old resolved grievances
 * POST   /api/admin/users/:id/reset-password  Reset any user's password
 */

const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { requireAuth }     = require('../middleware/auth');
const { requireFields, trimBody } = require('../middleware/validate');
const { ROLES }           = require('../config/constants');

const adminOnly = requireAuth([ROLES.ADMIN]);

router.get ('/dashboard',               adminOnly, ctrl.getDashboard);
router.get ('/workload',                adminOnly, ctrl.getWorkload);
router.get ('/db/health',               adminOnly, ctrl.getDbHealth);
router.get ('/db/backup',               adminOnly, ctrl.createBackup);
router.post('/db/restore',              adminOnly, ctrl.restoreBackup);
router.post('/grievances/bulk',         adminOnly, trimBody, requireFields(['ids','status']), ctrl.bulkUpdate);
router.get ('/export/csv',              adminOnly, ctrl.exportCSV);
router.delete('/grievances/purge',      adminOnly, trimBody, requireFields(['days']), ctrl.purgeResolved);
router.post('/users/:id/reset-password',adminOnly, trimBody, requireFields(['newPassword']), ctrl.resetPassword);

module.exports = router;
