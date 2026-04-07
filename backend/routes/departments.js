/**
 * routes/departments.js
 * /api/departments  — public, no auth required
 */

const router = require('express').Router();
const { DEPARTMENTS } = require('../config/constants');

router.get('/', (req, res) => res.json(DEPARTMENTS));

router.get('/:id', (req, res) => {
  const dept = DEPARTMENTS.find(d => d.id === req.params.id.toUpperCase());
  if (!dept) return res.status(404).json({ error: 'Department not found.' });
  res.json(dept);
});

module.exports = router;
