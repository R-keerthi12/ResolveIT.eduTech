/**
 * services/statsService.js
 *
 * Computes all dashboard summary statistics.
 * Centralises aggregation logic so multiple callers stay consistent.
 */

const { read }               = require('../config/db');
const { FILES, DEPARTMENTS } = require('../config/constants');

/**
 * Full stats summary.
 * Returns grievance counts, user counts, feedback averages,
 * per-department breakdown, and a recent-activity timeline.
 */
function getSummary() {
  const grievances = read(FILES.GRIEVANCES, []);
  const users      = read(FILES.USERS,      []);
  const feedback   = read(FILES.FEEDBACK,   []);

  const count = (arr, key, val) => arr.filter(x => x[key] === val).length;

  // ── Feedback avg rating ──
  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0';

  // ── Resolution rate ──
  const resolutionRate = grievances.length
    ? ((count(grievances, 'status', 'Resolved') / grievances.length) * 100).toFixed(1)
    : '0.0';

  // ── Average resolution time (days) for resolved grievances ──
  const resolvedWithDates = grievances.filter(g =>
    g.status === 'Resolved' && g.date && g.updatedAt
  );
  let avgResolutionDays = '—';
  if (resolvedWithDates.length) {
    const totalDays = resolvedWithDates.reduce((sum, g) => {
      const start = new Date(g.date).getTime();
      const end   = new Date(g.updatedAt).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    avgResolutionDays = (totalDays / resolvedWithDates.length).toFixed(1);
  }

  // ── By department ──
  const byDept = DEPARTMENTS.map(d => ({
    id:         d.id,
    name:       d.name,
    icon:       d.icon,
    total:      count(grievances, 'dept', d.id),
    pending:    grievances.filter(g => g.dept === d.id && g.status === 'Pending').length,
    inProgress: grievances.filter(g => g.dept === d.id && g.status === 'In Progress').length,
    resolved:   grievances.filter(g => g.dept === d.id && g.status === 'Resolved').length,
    forwarded:  grievances.filter(g => g.dept === d.id && g.status.startsWith('Forwarded')).length,
  }));

  // ── Recent activity (last 10 grievances sorted by date) ──
  const recent = [...grievances]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map(g => ({
      id:       g.id,
      subject:  g.subject,
      dept:     g.dept,
      status:   g.status,
      priority: g.priority,
      date:     g.date,
      student:  g.student,
    }));

  // ── Priority breakdown ──
  const byPriority = {
    urgent: count(grievances, 'priority', 'Urgent'),
    high:   count(grievances, 'priority', 'High'),
    normal: count(grievances, 'priority', 'Normal'),
  };

  return {
    grievances: {
      total:          grievances.length,
      pending:        count(grievances, 'status', 'Pending'),
      inProgress:     count(grievances, 'status', 'In Progress'),
      resolved:       count(grievances, 'status', 'Resolved'),
      forwarded:      grievances.filter(g => g.status.startsWith('Forwarded')).length,
      resolutionRate: resolutionRate + '%',
      avgResolutionDays,
    },
    users: {
      total:     users.length,
      students:  count(users, 'role', 'student'),
      resolvers: count(users, 'role', 'resolver'),
      admins:    count(users, 'role', 'admin'),
    },
    feedback: {
      total:     feedback.length,
      avgRating,
    },
    byPriority,
    byDept,
    recentActivity: recent,
  };
}

module.exports = { getSummary };
