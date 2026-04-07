/**
 * routes/stats.js
 * /api/stats
 */

const router = require('express').Router();
const { getSummary } = require('../controllers/statsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth(), getSummary);

module.exports = router;
