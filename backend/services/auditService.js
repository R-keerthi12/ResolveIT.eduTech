/**
 * services/auditService.js
 *
 * Append-only audit log.
 * Every significant action in the system writes an entry to data/audit.json.
 *
 * Entry shape:
 * {
 *   id:        string,   // auto uuid
 *   event:     string,   // e.g. "GRIEVANCE_CREATED"
 *   actor:     string,   // email of the user who triggered it
 *   at:        string,   // ISO timestamp
 *   meta:      object,   // event-specific details
 * }
 */


const path           = require('path');
const fs             = require('fs');
const { DATA_DIR }   = require('../config/constants');

const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

/**
 * Append one entry to the audit log.
 * Silently swallows write errors so auditing never crashes the main flow.
 */
function createAuditEntry(event, actor, meta = {}) {
  try {
    const entry = {
      id:    require('crypto').randomUUID(),
      event,
      actor: actor || 'system',
      at:    new Date().toISOString(),
      meta,
    };

    let log = [];
    if (fs.existsSync(AUDIT_FILE)) {
      try { log = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')); }
      catch { log = []; }
    }

    log.push(entry);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2));
  } catch (err) {
    console.warn('[audit] Failed to write audit entry:', err.message);
  }
}

/**
 * Read audit log with optional filters.
 * @param {{ event?, actor?, from?, to?, limit? }} filters
 */
function getAuditLog(filters = {}) {
  if (!fs.existsSync(AUDIT_FILE)) return [];

  let log = [];
  try { log = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')); }
  catch { return []; }

  if (filters.event) log = log.filter(e => e.event === filters.event);
  if (filters.actor) log = log.filter(e => e.actor === filters.actor);
  if (filters.from)  log = log.filter(e => e.at >= filters.from);
  if (filters.to)    log = log.filter(e => e.at <= filters.to);

  // Most recent first
  log.sort((a, b) => (a.at < b.at ? 1 : -1));

  const limit = Math.min(parseInt(filters.limit) || 200, 500);
  return log.slice(0, limit);
}

module.exports = { createAuditEntry, getAuditLog };
