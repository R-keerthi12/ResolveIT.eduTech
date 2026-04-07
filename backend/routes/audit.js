/**
 * routes/audit.js
 * GET /api/audit  — admin only
 */

const router              = require('express').Router();
const { requireAuth }     = require('../middleware/auth');
const { getAuditLog }     = require('../services/auditService');
const { ROLES }           = require('../config/constants');

router.get('/', requireAuth([ROLES.ADMIN]), (req, res) => {
  const log = getAuditLog({
    event: req.query.event,
    actor: req.query.actor,
    from:  req.query.from,
    to:    req.query.to,
    limit: req.query.limit,
  });
  res.json({ total: log.length, entries: log });
});

module.exports = router;
