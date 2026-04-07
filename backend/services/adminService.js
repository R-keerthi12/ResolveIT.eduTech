/**
 * services/adminService.js
 *
 * Business logic for admin-only operations that span multiple domains.
 *
 * Covers:
 *  1.  Full dashboard aggregate (stats + recent activity + resolver workloads)
 *  2.  Bulk grievance status update
 *  3.  Resolver workload report (how many grievances per resolver)
 *  4.  Data export — grievances as CSV
 *  5.  Database health — file sizes, record counts, last modified
 *  6.  Database backup — returns full snapshot of all data
 *  7.  Database restore — overwrites data from a validated snapshot
 *  8.  Purge resolved grievances older than N days
 */

const fs                         = require('fs');
const path                       = require('path');
const { read, write }            = require('../config/db');
const { FILES, DATA_DIR, DEPARTMENTS, STATUSES, PRIORITIES, ROLES } = require('../config/constants');
const { createAuditEntry }       = require('./auditService');
const { getSummary }             = require('./statsService');
const { ALLOWED_TRANSITIONS }    = require('./grievanceService');
const { sendBulkStatusEmails } = require('./emailService');

function today() { return new Date().toISOString().split('T')[0]; }

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSVRow(cols) { return cols.map(escapeCSV).join(','); }


// ═══════════════════════════════════════════════════════════════════════════
// 1. FULL DASHBOARD AGGREGATE
// ═══════════════════════════════════════════════════════════════════════════

function getDashboard() {
  const summary      = getSummary();
  const grievances   = read(FILES.GRIEVANCES, []);
  const users        = read(FILES.USERS, []);

  // Resolver workloads
  const resolvers    = users.filter(u => u.role === ROLES.RESOLVER);
  const workload     = resolvers.map(r => {
    const assigned = grievances.filter(g => g.dept === r.dept);
    return {
      id:         r.id,
      name:       r.name,
      email:      r.email,
      dept:       r.dept,
      deptName:   r.deptName,
      total:      assigned.length,
      pending:    assigned.filter(g => g.status === 'Pending').length,
      inProgress: assigned.filter(g => g.status === 'In Progress').length,
      resolved:   assigned.filter(g => g.status === 'Resolved').length,
    };
  });

  // Overdue: Pending or In Progress for > 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const overdue      = grievances.filter(g =>
    ['Pending', 'In Progress'].includes(g.status) &&
    new Date(g.date).getTime() < sevenDaysAgo
  ).length;

  return {
    data: {
      ...summary,
      resolverWorkload: workload,
      overdue,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// 2. BULK STATUS UPDATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update multiple grievances at once.
 * @param {string[]} ids        Array of grievance IDs
 * @param {string}   newStatus  Target status
 * @param {string}   remarks    Optional remark applied to all
 * @param {object}   actor      { email, role }
 */
function bulkUpdateStatus(ids, newStatus, remarks, actor) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'ids must be a non-empty array.', status: 400 };
  }
  if (ids.length > 50) {
    return { error: 'Cannot bulk-update more than 50 grievances at once.', status: 400 };
  }
  if (!STATUSES.includes(newStatus)) {
    return { error: `Invalid status "${newStatus}". Valid: ${STATUSES.join(', ')}`, status: 400 };
  }

  const all     = read(FILES.GRIEVANCES, []);
  const now     = new Date().toISOString();
  const results = { updated: [], skipped: [], notFound: [] };

  ids.forEach(id => {
    const idx = all.findIndex(g => g.id === id);
    if (idx === -1) { results.notFound.push(id); return; }

    const g = all[idx];
    if (!ALLOWED_TRANSITIONS[g.status] || !ALLOWED_TRANSITIONS[g.status].includes(newStatus)) {
      results.skipped.push({ id, reason: `Cannot transition from "${g.status}" to "${newStatus}"` });
      return;
    }

    g.status    = newStatus;
    g.remarks   = remarks || g.remarks;
    g.updatedAt = now;
    if (!g.history) g.history = [];
    g.history.push({ status: newStatus, by: actor.email, at: now, note: remarks || 'Bulk update.' });
    results.updated.push(id);
  });

  write(FILES.GRIEVANCES, all);
  createAuditEntry('BULK_STATUS_UPDATE', actor.email, {
    targetStatus: newStatus,
    updated: results.updated.length,
    skipped: results.skipped.length,
  });

  // Send email for every bulk status change
  const updatedGrievances = all.filter(g => results.updated.includes(g.id));
  if (updatedGrievances.length > 0) {
    sendBulkStatusEmails(updatedGrievances, newStatus).catch(() => {}); // non-blocking
  }

  return { data: results };
}


// ═══════════════════════════════════════════════════════════════════════════
// 3. RESOLVER WORKLOAD REPORT
// ═══════════════════════════════════════════════════════════════════════════

function getResolverWorkload() {
  const grievances = read(FILES.GRIEVANCES, []);
  const users      = read(FILES.USERS, []);
  const resolvers  = users.filter(u => u.role === ROLES.RESOLVER);

  const workload = resolvers.map(r => {
    const assigned = grievances.filter(g => g.dept === r.dept);
    const resolved = assigned.filter(g => g.status === 'Resolved');
    const rate     = assigned.length > 0
      ? ((resolved.length / assigned.length) * 100).toFixed(1) + '%'
      : '0.0%';
    return {
      id:              r.id,
      name:            r.name,
      email:           r.email,
      dept:            r.dept,
      deptName:        r.deptName,
      total:           assigned.length,
      pending:         assigned.filter(g => g.status === 'Pending').length,
      inProgress:      assigned.filter(g => g.status === 'In Progress').length,
      resolved:        resolved.length,
      forwarded:       assigned.filter(g => g.status.startsWith('Forwarded')).length,
      resolutionRate:  rate,
    };
  });

  return { data: workload };
}


// ═══════════════════════════════════════════════════════════════════════════
// 4. CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export grievances as CSV string.
 * @param {{ dept?, status?, priority?, from?, to? }} filters
 */
function exportGrievancesCSV(filters = {}) {
  let data = read(FILES.GRIEVANCES, []);

  if (filters.dept)     data = data.filter(g => g.dept === filters.dept);
  if (filters.status)   data = data.filter(g => g.status === filters.status);
  if (filters.priority) data = data.filter(g => g.priority === filters.priority);
  if (filters.from)     data = data.filter(g => g.date >= filters.from);
  if (filters.to)       data = data.filter(g => g.date <= filters.to);

  const HEADERS = ['ID', 'Subject', 'Department', 'Status', 'Priority', 'Date', 'Student', 'Student Email', 'Remarks', 'Updated At'];
  const rows    = [toCSVRow(HEADERS)];

  data.forEach(g => {
    rows.push(toCSVRow([
      g.id, g.subject, g.deptName, g.status, g.priority,
      g.date, g.student, g.studentEmail, g.remarks || '', g.updatedAt || '',
    ]));
  });

  return { data: rows.join('\n'), count: data.length };
}


// ═══════════════════════════════════════════════════════════════════════════
// 5. DATABASE HEALTH
// ═══════════════════════════════════════════════════════════════════════════

function getDbHealth() {
  const fileNames = [...Object.values(FILES), 'audit.json'];
  const info      = fileNames.map(name => {
    const fp = path.join(DATA_DIR, name);
    if (!fs.existsSync(fp)) return { file: name, exists: false };
    const stat    = fs.statSync(fp);
    let   records = 0;
    try { records = JSON.parse(fs.readFileSync(fp, 'utf8')).length; } catch {}
    return {
      file:         name,
      exists:       true,
      sizeBytes:    stat.size,
      sizeKB:       (stat.size / 1024).toFixed(2),
      records,
      lastModified: stat.mtime.toISOString(),
    };
  });

  return { data: { files: info, dataDir: DATA_DIR } };
}


// ═══════════════════════════════════════════════════════════════════════════
// 6. BACKUP
// ═══════════════════════════════════════════════════════════════════════════

function createBackup(actorEmail) {
  const snapshot = {
    exportedAt:  new Date().toISOString(),
    exportedBy:  actorEmail,
    version:     '2.0',
    users:       read(FILES.USERS,      []).map(({ password: _pw, ...u }) => u), // strip passwords
    grievances:  read(FILES.GRIEVANCES, []),
    feedback:    read(FILES.FEEDBACK,   []),
  };

  createAuditEntry('DB_BACKUP', actorEmail, { grievances: snapshot.grievances.length, users: snapshot.users.length });

  return { data: snapshot };
}


// ═══════════════════════════════════════════════════════════════════════════
// 7. RESTORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Restore data from a backup snapshot.
 * Only grievances and feedback are restored — users are NOT overwritten
 * (passwords were stripped from backup and restoring users would be dangerous).
 */
function restoreBackup(snapshot, actorEmail) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { error: 'Invalid snapshot format.', status: 400 };
  }
  if (!Array.isArray(snapshot.grievances) || !Array.isArray(snapshot.feedback)) {
    return { error: 'Snapshot must contain grievances and feedback arrays.', status: 400 };
  }

  write(FILES.GRIEVANCES, snapshot.grievances);
  write(FILES.FEEDBACK,   snapshot.feedback);

  createAuditEntry('DB_RESTORE', actorEmail, {
    grievances: snapshot.grievances.length,
    feedback:   snapshot.feedback.length,
    originalExportDate: snapshot.exportedAt,
  });

  return {
    data: {
      message:    'Restore completed. Grievances and feedback have been overwritten. Users were NOT changed.',
      grievances: snapshot.grievances.length,
      feedback:   snapshot.feedback.length,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// 8. PURGE OLD RESOLVED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hard-delete resolved grievances older than `days` days.
 * Also removes their feedback. Returns the count purged.
 */
function purgeResolved(days, actorEmail) {
  const daysNum = parseInt(days);
  if (isNaN(daysNum) || daysNum < 1) {
    return { error: 'days must be a positive integer.', status: 400 };
  }
  if (daysNum < 30) {
    return { error: 'Safety guard: cannot purge grievances resolved fewer than 30 days ago.', status: 400 };
  }

  const cutoff    = Date.now() - daysNum * 24 * 60 * 60 * 1000;
  let   grievances = read(FILES.GRIEVANCES, []);
  const toDelete  = grievances.filter(g =>
    g.status === 'Resolved' &&
    g.updatedAt &&
    new Date(g.updatedAt).getTime() < cutoff
  );
  const deleteIDs = new Set(toDelete.map(g => g.id));

  grievances = grievances.filter(g => !deleteIDs.has(g.id));
  write(FILES.GRIEVANCES, grievances);

  let feedback = read(FILES.FEEDBACK, []);
  const fbBefore = feedback.length;
  feedback = feedback.filter(f => !deleteIDs.has(f.grievanceId));
  write(FILES.FEEDBACK, feedback);

  createAuditEntry('PURGE_RESOLVED', actorEmail, {
    days:     daysNum,
    purged:   toDelete.length,
    feedback: fbBefore - feedback.length,
  });

  return {
    data: {
      purged:          toDelete.length,
      feedbackRemoved: fbBefore - feedback.length,
      message:         `${toDelete.length} resolved grievance(s) older than ${daysNum} days have been permanently deleted.`,
    },
  };
}

module.exports = {
  getDashboard,
  bulkUpdateStatus,
  getResolverWorkload,
  exportGrievancesCSV,
  getDbHealth,
  createBackup,
  restoreBackup,
  purgeResolved,
};
