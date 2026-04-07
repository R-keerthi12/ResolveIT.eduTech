/**
 * routes/grievances.js
 * /api/grievances
 */

const router = require('express').Router();
const ctrl   = require('../controllers/grievanceController');
const { requireAuth }    = require('../middleware/auth');
const { requireFields, trimBody } = require('../middleware/validate');
const { ROLES }          = require('../config/constants');
const { read }           = require('../config/db');
const { FILES }          = require('../config/constants');

const { ADMIN, RESOLVER, STUDENT } = ROLES;

router.get ('/',     requireAuth(),                                                          ctrl.list);
router.get ('/:id',  requireAuth(),                                                          ctrl.getOne);
router.post('/',     requireAuth([STUDENT, ADMIN]), trimBody, requireFields(['subject','dept','desc']), ctrl.create);
router.patch('/:id', requireAuth([RESOLVER, ADMIN]), trimBody,                               ctrl.update);
router.delete('/:id',requireAuth([ADMIN]),                                                   ctrl.remove);

// ── Status history for a single grievance ───────────────────────────────────
router.get('/:id/history', requireAuth(), (req, res) => {
  const all = read(FILES.GRIEVANCES, []);
  const g   = all.find(x => x.id === req.params.id);
  if (!g) return res.status(404).json({ error: 'Grievance not found.' });

  if (req.user.role === STUDENT && g.studentEmail !== req.user.email) {
    return res.status(403).json({ error: 'You may only view your own grievances.' });
  }

  res.json({
    id:       g.id,
    subject:  g.subject,
    current:  g.status,
    history:  g.history || [],
  });
});

// ── Withdraw a grievance (student only, Pending only) ────────────────────────
router.delete('/:id/withdraw', requireAuth([STUDENT]), (req, res) => {
  const { read: r, write: w } = require('../config/db');
  const all = r(FILES.GRIEVANCES, []);
  const idx = all.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grievance not found.' });

  const g = all[idx];
  if (g.studentEmail !== req.user.email) {
    return res.status(403).json({ error: 'You may only withdraw your own grievances.' });
  }
  if (g.status !== 'Pending') {
    return res.status(422).json({ error: `Only Pending grievances can be withdrawn. Current status: "${g.status}".` });
  }

  all.splice(idx, 1);
  w(FILES.GRIEVANCES, all);

  const { createAuditEntry } = require('../services/auditService');
  createAuditEntry('GRIEVANCE_WITHDRAWN', req.user.email, { grievanceId: req.params.id });

  res.json({ message: `Grievance ${req.params.id} withdrawn.` });
});

module.exports = router;
