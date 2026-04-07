/**
 * routes/users.js
 * /api/users
 */

const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { requireAuth }    = require('../middleware/auth');
const { requireFields, trimBody } = require('../middleware/validate');
const { ROLES }          = require('../config/constants');

const { ADMIN } = ROLES;

// /me is accessible by any authenticated user
router.get('/me',    requireAuth(),        ctrl.getMe);

// All other user management is admin-only
router.get ('/',     requireAuth([ADMIN]), ctrl.list);
router.get ('/:id',  requireAuth([ADMIN]), ctrl.getOne);
router.post('/',     requireAuth([ADMIN]), trimBody, requireFields(['name','email','password','role']), ctrl.create);
router.patch('/:id', requireAuth([ADMIN]), trimBody, ctrl.update);
router.delete('/:id',requireAuth([ADMIN]), ctrl.remove);

module.exports = router;
