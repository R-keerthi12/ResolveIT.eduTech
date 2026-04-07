/**
 * services/authService.js
 *
 * Full authentication business logic.
 *
 * Features:
 *  1.  Login with email + password → returns token + user
 *  2.  Token decode / verify
 *  3.  Logout — adds token to in-memory blacklist (invalidated for process lifetime)
 *  4.  Brute-force lockout — 5 failed attempts → 15-minute lockout per email
 *  5.  Login rate limiter — max 10 attempts per IP per minute
 *  6.  Change password — verifies old password before accepting new
 *  7.  Student self-registration
 *  8.  Token refresh — issues a fresh token for a still-valid one
 */

const { read, write }            = require('../config/db');
const { FILES, ROLES }           = require('../config/constants');
const { createAuditEntry }       = require('./auditService');

// ── In-memory stores (reset on server restart) ───────────────────────────────
const tokenBlacklist  = new Set();          // invalidated tokens
const failedAttempts  = new Map();          // email → { count, lockedUntil }
const ipAttempts      = new Map();          // ip    → { count, windowStart }

const MAX_FAILED      = 5;
const LOCKOUT_MS      = 15 * 60 * 1000;    // 15 minutes
const IP_WINDOW_MS    = 60 * 1000;          // 1 minute
const IP_MAX_ATTEMPTS = 10;

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Build a token string: base64(email:role:issuedAt)
 */
function buildToken(email, role) {
  const payload = `${email}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString('base64');
}

/**
 * Decode a token. Returns null if malformed or blacklisted.
 * @returns {{ email, role, issuedAt } | null}
 */
function decodeToken(raw = '') {
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  if (!token || tokenBlacklist.has(token)) return null;
  try {
    const decoded  = Buffer.from(token, 'base64').toString('utf8');
    const parts    = decoded.split(':');
    if (parts.length < 3) return null;
    const issuedAt = Number(parts[parts.length - 1]);
    const role     = parts[parts.length - 2];
    const email    = parts.slice(0, parts.length - 2).join(':'); // handles emails with colons (edge case)
    if (!email || !role || isNaN(issuedAt)) return null;
    return { email, role, issuedAt, raw: token };
  } catch {
    return null;
  }
}

// ── Brute-force helpers ───────────────────────────────────────────────────────

function recordFailed(email) {
  const rec = failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
  rec.count++;
  if (rec.count >= MAX_FAILED) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  failedAttempts.set(email, rec);
}

function clearFailed(email) {
  failedAttempts.delete(email);
}

function isLocked(email) {
  const rec = failedAttempts.get(email);
  if (!rec || rec.lockedUntil === 0) return false;
  if (Date.now() > rec.lockedUntil) { failedAttempts.delete(email); return false; }
  return true;
}

function lockoutRemainingSeconds(email) {
  const rec = failedAttempts.get(email);
  if (!rec) return 0;
  return Math.max(0, Math.ceil((rec.lockedUntil - Date.now()) / 1000));
}

// ── IP rate limiter helper ────────────────────────────────────────────────────

function isIpRateLimited(ip) {
  const now = Date.now();
  const rec = ipAttempts.get(ip) || { count: 0, windowStart: now };
  if (now - rec.windowStart > IP_WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  rec.count++;
  ipAttempts.set(ip, rec);
  return rec.count > IP_MAX_ATTEMPTS;
}

// ── Password validator (shared) ───────────────────────────────────────────────

function validatePassword(password) {
  if (!password || password.length < 6)  return 'Password must be at least 6 characters.';
  if (password.length > 128)             return 'Password must be under 128 characters.';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SERVICE METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Login.
 * @param {string} email
 * @param {string} password
 * @param {string} ip        Client IP for rate limiting
 */
function login(email, password, ip) {
  // IP rate limit
  if (isIpRateLimited(ip)) {
    return { error: 'Too many login attempts from this IP. Try again in a minute.', status: 429 };
  }

  // Account lockout
  if (isLocked(email)) {
    const secs = lockoutRemainingSeconds(email);
    return {
      error: `Account temporarily locked due to too many failed attempts. Try again in ${secs} seconds.`,
      status: 429,
    };
  }

  const users = read(FILES.USERS, []);
  const user  = users.find(u => u.email === email.toLowerCase().trim());

  if (!user || user.password !== password) {
    recordFailed(email);
    const rec    = failedAttempts.get(email) || {};
    const left   = MAX_FAILED - (rec.count || 0);
    const suffix = left > 0 ? ` (${left} attempt${left !== 1 ? 's' : ''} remaining before lockout)` : '';
    return { error: `Invalid email or password.${suffix}`, status: 401 };
  }

  clearFailed(email);

  const token = buildToken(user.email, user.role);
  const { password: _pw, ...safeUser } = user;

  createAuditEntry('LOGIN', user.email, { ip });

  return { data: { user: safeUser, token } };
}

/**
 * Logout — blacklists the token so it cannot be reused.
 * @param {string} rawHeader  Authorization header value
 */
function logout(rawHeader) {
  const decoded = decodeToken(rawHeader);
  if (decoded) {
    tokenBlacklist.add(decoded.raw);
    createAuditEntry('LOGOUT', decoded.email, {});
  }
  return { data: { message: 'Logged out successfully.' } };
}

/**
 * Refresh token — issues a new token for an existing valid one.
 * Blacklists the old one.
 */
function refreshToken(rawHeader) {
  const decoded = decodeToken(rawHeader);
  if (!decoded) return { error: 'Invalid or expired token.', status: 401 };

  // Verify user still exists and role hasn't changed
  const users = read(FILES.USERS, []);
  const user  = users.find(u => u.email === decoded.email);
  if (!user) return { error: 'User no longer exists.', status: 401 };
  if (user.role !== decoded.role) return { error: 'Role has changed. Please log in again.', status: 401 };

  tokenBlacklist.add(decoded.raw);
  const newToken = buildToken(user.email, user.role);
  const { password: _pw, ...safeUser } = user;

  return { data: { user: safeUser, token: newToken } };
}

/**
 * Change password.
 * Requires the current password to be correct.
 */
function changePassword(email, oldPassword, newPassword) {
  const passErr = validatePassword(newPassword);
  if (passErr) return { error: passErr, status: 400 };

  if (oldPassword === newPassword) {
    return { error: 'New password must differ from the current password.', status: 400 };
  }

  const users = read(FILES.USERS, []);
  const idx   = users.findIndex(u => u.email === email);
  if (idx === -1) return { error: 'User not found.', status: 404 };

  if (users[idx].password !== oldPassword) {
    return { error: 'Current password is incorrect.', status: 401 };
  }

  users[idx].password  = newPassword;
  users[idx].updatedAt = new Date().toISOString();
  write(FILES.USERS, users);

  createAuditEntry('PASSWORD_CHANGED', email, {});

  return { data: { message: 'Password updated successfully.' } };
}

/**
 * Self-registration for students.
 * Admins and resolvers must be created by an admin.
 */
function register(body) {
  const { name, email, password } = body;

  if (!name || !name.trim()) return { error: 'Name is required.', status: 400 };

  const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRE.test(email)) return { error: 'Invalid email format.', status: 400 };

  const passErr = validatePassword(password);
  if (passErr) return { error: passErr, status: 400 };

  const users = read(FILES.USERS, []);
  if (users.find(u => u.email === email.toLowerCase().trim())) {
    return { error: 'An account with that email already exists.', status: 409 };
  }

  const user = {
    id:        'U' + Date.now(),
    name:      name.trim(),
    email:     email.toLowerCase().trim(),
    password,
    role:      ROLES.STUDENT,   // self-registration always creates students
    dept:      '',
    deptName:  '',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  write(FILES.USERS, users);

  const token = buildToken(user.email, user.role);
  const { password: _pw, ...safeUser } = user;

  createAuditEntry('REGISTER', user.email, { name: user.name });

  return { data: { user: safeUser, token }, status: 201 };
}

/**
 * Admin-only: reset a user's password without knowing the old one.
 */
function adminResetPassword(targetId, newPassword, actorEmail) {
  const passErr = validatePassword(newPassword);
  if (passErr) return { error: passErr, status: 400 };

  const users = read(FILES.USERS, []);
  const idx   = users.findIndex(u => u.id === targetId);
  if (idx === -1) return { error: 'User not found.', status: 404 };

  users[idx].password  = newPassword;
  users[idx].updatedAt = new Date().toISOString();
  write(FILES.USERS, users);

  createAuditEntry('ADMIN_RESET_PASSWORD', actorEmail, { targetId, targetEmail: users[idx].email });

  return { data: { message: `Password reset for user ${targetId}.` } };
}

module.exports = {
  login,
  logout,
  refreshToken,
  changePassword,
  register,
  adminResetPassword,
  decodeToken,
  tokenBlacklist,
};
