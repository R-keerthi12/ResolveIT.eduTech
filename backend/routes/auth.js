/**
 * routes/auth.js
 * /api/auth
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/authController');
const { requireAuth }                    = require('../middleware/auth');
const { requireFields, trimBody }        = require('../middleware/validate');
const { authLimiter }                    = require('../middleware/rateLimiter');

// Public
router.post('/login',    authLimiter, trimBody, requireFields(['email','password']), ctrl.login);
router.post('/register', trimBody, requireFields(['name','email','password']), ctrl.register);

// Authenticated
router.post('/logout',          requireAuth(), ctrl.logout);
router.post('/refresh',         requireAuth(), ctrl.refresh);
router.post('/change-password', requireAuth(), trimBody,
  requireFields(['oldPassword','newPassword']), ctrl.changePassword);

module.exports = router;
