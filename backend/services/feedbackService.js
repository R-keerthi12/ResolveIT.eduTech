/**
 * services/feedbackService.js
 *
 * Business logic for feedback.
 *
 * Rules enforced:
 *  1. Student may only submit feedback on their own grievances
 *  2. Feedback only allowed on Resolved grievances
 *  3. Only one feedback per grievance per student (no duplicates)
 *  4. Rating must be integer 1–5
 *  5. Message length capped at 1000 chars
 */


const { read, write }       = require('../config/db');
const { FILES, ROLES }      = require('../config/constants');
const { createAuditEntry }  = require('./auditService');

function today() { return new Date().toISOString().split('T')[0]; }


// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SERVICE METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List all feedback entries.
 * Optionally filter by grievanceId.
 */
function listFeedback(filters = {}) {
  let data = read(FILES.FEEDBACK, []);
  if (filters.grievanceId) data = data.filter(f => f.grievanceId === filters.grievanceId);
  if (filters.submittedBy) data = data.filter(f => f.submittedBy === filters.submittedBy);
  return { data };
}

/**
 * Get a single feedback by ID.
 */
function getFeedbackByID(id) {
  const fb = read(FILES.FEEDBACK, []).find(f => f.id === id);
  if (!fb) return { error: 'Feedback not found.', status: 404 };
  return { data: fb };
}

/**
 * Submit feedback for a resolved grievance.
 */
function createFeedback(body, user) {
  const { grievanceId, rating, message } = body;

  // Rating validation
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return { error: 'rating must be a whole number between 1 and 5.', status: 400 };
  }

  // Message length cap
  if (message && message.length > 1000) {
    return { error: 'Feedback message may not exceed 1000 characters.', status: 400 };
  }

  const grievances = read(FILES.GRIEVANCES, []);
  const grievance  = grievances.find(g => g.id === grievanceId);

  // Grievance must exist
  if (!grievance) return { error: 'Grievance not found.', status: 404 };

  // Ownership check (students only — enforced at route level but double-checked here)
  if (user.role === ROLES.STUDENT && grievance.studentEmail !== user.email) {
    return { error: 'You may only submit feedback for your own grievances.', status: 403 };
  }

  // Grievance must be Resolved
  if (grievance.status !== 'Resolved') {
    return {
      error: `Feedback can only be submitted for Resolved grievances. Current status: "${grievance.status}".`,
      status: 422,
    };
  }

  // One feedback per grievance per student
  const allFeedback = read(FILES.FEEDBACK, []);
  const already     = allFeedback.find(
    f => f.grievanceId === grievanceId && f.submittedBy === user.email
  );
  if (already) {
    return {
      error: 'You have already submitted feedback for this grievance.',
      status: 409,
    };
  }

  const fb = {
    id:          require('crypto').randomUUID(),
    grievanceId,
    rating:      ratingNum,
    message:     (message || '').trim(),
    submittedBy: user.email,
    date:        today(),
  };

  allFeedback.push(fb);
  write(FILES.FEEDBACK, allFeedback);

  createAuditEntry('FEEDBACK_SUBMITTED', user.email, { grievanceId, rating: ratingNum });

  return { data: fb, status: 201 };
}

/**
 * Delete a feedback entry (admin only — enforced at route level).
 */
function deleteFeedback(id, actorEmail) {
  let all    = read(FILES.FEEDBACK, []);
  const item = all.find(f => f.id === id);
  if (!item) return { error: 'Feedback not found.', status: 404 };

  all = all.filter(f => f.id !== id);
  write(FILES.FEEDBACK, all);

  createAuditEntry('FEEDBACK_DELETED', actorEmail, { feedbackId: id });

  return { data: { message: 'Feedback deleted.' } };
}

module.exports = { listFeedback, getFeedbackByID, createFeedback, deleteFeedback };
