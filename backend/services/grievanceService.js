/**
 * services/grievanceService.js
 *
 * All business logic for grievances lives here.
 * Controllers call these functions — they should contain NO business decisions.
 *
 * Rules enforced here:
 *  1. Grievance ID uniqueness (retry on collision)
 *  2. Duplicate submission guard (same student, same dept, same subject within 24h)
 *  3. Status transition machine — only valid moves are allowed
 *  4. Resolver department scope — resolvers may only update grievances in their dept
 *  5. Immutable fields — student, date, id cannot be patched
 *  6. Priority must be one of the allowed values
 */

const { read, write }                = require('../config/db');
const { FILES, DEPARTMENTS, ROLES, STATUSES, PRIORITIES } = require('../config/constants');
const { createAuditEntry }          = require('./auditService');
const { sendStatusEmail }           = require('./emailService');

// ── Status transition machine ────────────────────────────────────────────────
// Maps each status to the set of statuses it may legally transition to.
const ALLOWED_TRANSITIONS = {
  'Pending':            ['In Progress', 'Forwarded', 'Forwarded to Admin'],
  'In Progress':        ['Resolved', 'Forwarded', 'Forwarded to Admin', 'Pending'],
  'Forwarded':          ['In Progress', 'Resolved', 'Forwarded to Admin'],
  'Forwarded to Admin': ['In Progress', 'Resolved'],
  'Resolved':           [],   // terminal — cannot be reopened via API
};

function isValidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ── ID generation with collision retry ──────────────────────────────────────
function generateUniqueID(existingIDs, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const id = 'GRV' + (1000 + Math.floor(Math.random() * 9000));
    if (!existingIDs.has(id)) return id;
  }
  // Fallback: timestamp-based
  return 'GRV' + Date.now();
}

// ── Duplicate detection ──────────────────────────────────────────────────────
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function isDuplicate(all, studentEmail, dept, subject) {
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  return all.some(g => {
    const ts = new Date(g.date).getTime();
    return (
      g.studentEmail === studentEmail &&
      g.dept         === dept &&
      g.subject.toLowerCase().trim() === subject.toLowerCase().trim() &&
      ts >= cutoff
    );
  });
}

// ── today helper ─────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0]; }


// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SERVICE METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List grievances with optional filters and pagination.
 * Students are automatically restricted to their own.
 *
 * @param {object} filters  { dept, status, priority, studentEmail, page, limit, sort }
 * @param {object} user     { email, role }
 * @returns {{ data: array, total: number, page: number, pages: number }}
 */
function listGrievances(filters, user) {
  let data = read(FILES.GRIEVANCES, []);

  // Role-based scoping
  if (user.role === ROLES.STUDENT) {
    data = data.filter(g => g.studentEmail === user.email);
  } else if (user.role === ROLES.RESOLVER) {
    // Resolvers see all grievances but the ones in their dept are highlighted
    // (they can still view all — filtering is optional on client side)
  }

  // Apply explicit filters
  if (filters.dept)         data = data.filter(g => g.dept === filters.dept);
  if (filters.status)       data = data.filter(g => g.status === filters.status);
  if (filters.priority)     data = data.filter(g => g.priority === filters.priority);
  if (filters.studentEmail && user.role !== ROLES.STUDENT) {
    data = data.filter(g => g.studentEmail === filters.studentEmail);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(g =>
      g.subject.toLowerCase().includes(q) ||
      g.desc.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q)
    );
  }

  // Sorting
  const sortField = filters.sort || 'date';
  const sortDir   = filters.order === 'asc' ? 1 : -1;
  data.sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * sortDir;
    if (a[sortField] > b[sortField]) return  1 * sortDir;
    return 0;
  });

  // Pagination
  const total = data.length;
  const limit = Math.min(parseInt(filters.limit) || 50, 100);
  const page  = Math.max(parseInt(filters.page)  || 1,  1);
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const slice = data.slice(start, start + limit);

  return { data: slice, total, page, pages, limit };
}

/**
 * Get a single grievance by ID, enforcing ownership for students.
 */
function getGrievanceByID(id, user) {
  const all = read(FILES.GRIEVANCES, []);
  const g   = all.find(x => x.id === id);

  if (!g) return { error: 'Grievance not found.', status: 404 };

  if (user.role === ROLES.STUDENT && g.studentEmail !== user.email) {
    return { error: 'You may only view your own grievances.', status: 403 };
  }

  return { data: g };
}

/**
 * Create a new grievance.
 * Enforces: valid dept, duplicate check, ID uniqueness.
 */
function createGrievance(body, user) {
  const { subject, dept, desc, priority } = body;

  // Validate department
  const deptObj = DEPARTMENTS.find(d => d.id === dept);
  if (!deptObj) {
    return { error: `Unknown department "${dept}". Valid IDs: ${DEPARTMENTS.map(d=>d.id).join(', ')}`, status: 400 };
  }

  // Validate priority
  if (priority && !PRIORITIES.includes(priority)) {
    return { error: `Invalid priority "${priority}". Must be one of: ${PRIORITIES.join(', ')}`, status: 400 };
  }

  const all = read(FILES.GRIEVANCES, []);

  // Duplicate check
  if (isDuplicate(all, user.email, dept, subject)) {
    return {
      error: 'A similar grievance was already submitted by you in the last 24 hours. Please wait before resubmitting.',
      status: 409,
    };
  }

  // Resolve student name
  const users    = read(FILES.USERS, []);
  const me       = users.find(u => u.email === user.email);
  const existIDs = new Set(all.map(g => g.id));

  const grievance = {
    id:           generateUniqueID(existIDs),
    subject:      subject.trim(),
    dept,
    deptName:     deptObj.name,
    category:     deptObj.name,
    desc:         desc.trim(),
    status:       'Pending',
    priority:     priority || 'Normal',
    date:         today(),
    student:      me ? me.name : user.email,
    studentEmail: user.email,
    remarks:      '',
    history:      [{ status: 'Pending', by: user.email, at: new Date().toISOString(), note: 'Grievance submitted.' }],
  };

  all.push(grievance);
  write(FILES.GRIEVANCES, all);

  createAuditEntry('GRIEVANCE_CREATED', user.email, { grievanceId: grievance.id, dept, subject });

  return { data: grievance, status: 201 };
}

/**
 * Update grievance status / priority / remarks.
 * Enforces:
 *   - Status transition machine
 *   - Resolver dept scope (resolvers can only update their own dept's grievances)
 *   - Immutable fields are ignored
 */
function updateGrievance(id, body, user) {
  const all = read(FILES.GRIEVANCES, []);
  const idx = all.findIndex(x => x.id === id);
  if (idx === -1) return { error: 'Grievance not found.', status: 404 };

  const grievance = all[idx];

  // Resolver scope enforcement
  if (user.role === ROLES.RESOLVER) {
    const users    = read(FILES.USERS, []);
    const resolver = users.find(u => u.email === user.email);
    if (resolver && resolver.dept && resolver.dept !== grievance.dept) {
      return {
        error: `You are assigned to "${resolver.deptName || resolver.dept}" and cannot update grievances from "${grievance.deptName}".`,
        status: 403,
      };
    }
  }

  // Status transition validation
  if (body.status && body.status !== grievance.status) {
    if (!STATUSES.includes(body.status)) {
      return { error: `Invalid status "${body.status}". Valid values: ${STATUSES.join(', ')}`, status: 400 };
    }
    if (!isValidTransition(grievance.status, body.status)) {
      return {
        error: `Cannot transition from "${grievance.status}" → "${body.status}". Allowed next states: ${(ALLOWED_TRANSITIONS[grievance.status] || []).join(', ') || 'none (terminal)'}`,
        status: 422,
      };
    }
  }

  // Priority validation
  if (body.priority && !PRIORITIES.includes(body.priority)) {
    return { error: `Invalid priority "${body.priority}". Must be one of: ${PRIORITIES.join(', ')}`, status: 400 };
  }

  // Apply only allowed fields (never let id, student, date be overwritten)
  const prevStatus = grievance.status;
  if (body.status  !== undefined) grievance.status  = body.status;
  if (body.priority !== undefined) grievance.priority = body.priority;
  if (body.remarks !== undefined) grievance.remarks = body.remarks;
  grievance.updatedAt = new Date().toISOString();

  // Append to history log
  if (!grievance.history) grievance.history = [];
  if (body.status && body.status !== prevStatus) {
    grievance.history.push({
      status: body.status,
      by:     user.email,
      at:     new Date().toISOString(),
      note:   body.remarks || '',
    });
  }

  all[idx] = grievance;
  write(FILES.GRIEVANCES, all);

  createAuditEntry('GRIEVANCE_UPDATED', user.email, {
    grievanceId: id,
    changes: { status: body.status, priority: body.priority, remarks: body.remarks },
  });

  // Send email notification for every status change
  if (body.status && body.status !== prevStatus) {
    sendStatusEmail(grievance, body.status).catch(() => {}); // non-blocking
  }

  return { data: grievance };
}

/**
 * Delete a grievance (admin only — enforced at route level).
 * Also removes related feedback entries.
 */
function deleteGrievance(id, user) {
  let grievances = read(FILES.GRIEVANCES, []);
  const exists   = grievances.find(g => g.id === id);
  if (!exists) return { error: 'Grievance not found.', status: 404 };

  grievances = grievances.filter(g => g.id !== id);
  write(FILES.GRIEVANCES, grievances);

  // Cascade: remove associated feedback
  let feedback = read(FILES.FEEDBACK, []);
  const removed = feedback.filter(f => f.grievanceId === id).length;
  feedback = feedback.filter(f => f.grievanceId !== id);
  write(FILES.FEEDBACK, feedback);

  createAuditEntry('GRIEVANCE_DELETED', user.email, { grievanceId: id, feedbackRemoved: removed });

  return { data: { message: `Grievance ${id} deleted. ${removed} feedback record(s) also removed.` } };
}

module.exports = {
  listGrievances,
  getGrievanceByID,
  createGrievance,
  updateGrievance,
  deleteGrievance,
  ALLOWED_TRANSITIONS,
};
