/**
 * routes/feedback.js
 * /api/feedback
 */

const router = require('express').Router();
const ctrl   = require('../controllers/feedbackController');
const { requireAuth } = require('../middleware/auth');
const { ROLES }       = require('../config/constants');

const { ADMIN, RESOLVER, STUDENT } = ROLES;

// Admins and resolvers see all feedback
router.get ('/',     requireAuth([ADMIN, RESOLVER]), ctrl.list);
router.get ('/:id',  requireAuth([ADMIN, RESOLVER]), ctrl.getOne);

// Students submit feedback and can read their own
router.post('/',     requireAuth([STUDENT]), ctrl.create);
router.get ('/mine', requireAuth([STUDENT]), (req, res) => {
  const svc = require('../services/feedbackService');
  const result = svc.listFeedback({ submittedBy: req.user.email });
  res.json(result.data);
});

router.delete('/:id', requireAuth([ADMIN]), ctrl.remove);

module.exports = router;
