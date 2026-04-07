/**
 * routes/ai.js — /api/ai
 *
 * POST /api/ai/suggest-dept     → suggest department for a grievance
 * POST /api/ai/suggest-reply    → generate admin reply suggestion
 * POST /api/ai/summarize        → one-line summary
 * POST /api/ai/check-similar    → find similar existing grievances
 */
const router  = require('express').Router();
const ai      = require('../services/aiService');
const { requireAuth } = require('../middleware/auth');

function send(res, result) {
  if (result.error) return res.status(500).json({ error: result.error });
  res.json(result.data);
}

// Suggest department — available to students (for smart form)
router.post('/suggest-dept', requireAuth(), async (req, res) => {
  const { subject, description } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  send(res, await ai.suggestDepartment(subject, description || ''));
});

// Suggest reply — admin/resolver only
router.post('/suggest-reply', requireAuth(['admin','resolver']), async (req, res) => {
  send(res, await ai.suggestReply(req.body));
});

// Summarize — any authenticated user
router.post('/summarize', requireAuth(), async (req, res) => {
  send(res, await ai.summarizeGrievance(req.body));
});

// Check similar — admin/resolver only
router.post('/check-similar', requireAuth(['admin','resolver']), async (req, res) => {
  const { read } = require('../config/db');
  const { FILES } = require('../config/constants');
  const all = read(FILES.GRIEVANCES, []);
  send(res, await ai.checkSimilar(req.body.subject, req.body.description, all));
});

module.exports = router;
