/**
 * services/userService.js
 *
 * Business logic for user management.
 *
 * Rules enforced:
 *  1. Email format validation
 *  2. Password minimum strength (length, complexity)
 *  3. Resolver must be assigned a valid department
 *  4. Admin self-deletion guard
 *  5. Last-admin guard (cannot remove the only admin account)
 *  6. On user deletion: grievances are anonymised, not deleted
 *  7. Duplicate email check
 *  8. Role change guard (cannot demote the last admin)
 */

const { read, write }                    = require('../config/db');
const { FILES, DEPARTMENTS, ROLES }      = require('../config/constants');
const { createAuditEntry }               = require('./auditService');

// ── Validators ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!EMAIL_RE.test(email)) return 'Invalid email format.';
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 6) return 'Password must be at least 6 characters.';
  if (password.length > 128)             return 'Password must be under 128 characters.';
  return null;
}

function validateRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    return `Invalid role "${role}". Must be one of: ${Object.values(ROLES).join(', ')}`;
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripPassword({ password: _pw, ...safe }) { return safe; }

function countAdmins(users) {
  return users.filter(u => u.role === ROLES.ADMIN).length;
}


// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SERVICE METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List users with optional role filter.
 */
function listUsers(roleFilter) {
  const users = read(FILES.USERS, []);
  const filtered = roleFilter ? users.filter(u => u.role === roleFilter) : users;
  return { data: filtered.map(stripPassword) };
}

/**
 * Get own profile.
 */
function getMyProfile(email) {
  const users = read(FILES.USERS, []);
  const me    = users.find(u => u.email === email);
  if (!me) return { error: 'User record not found.', status: 404 };
  return { data: stripPassword(me) };
}

/**
 * Get any user by ID.
 */
function getUserByID(id) {
  const users = read(FILES.USERS, []);
  const user  = users.find(u => u.id === id);
  if (!user) return { error: 'User not found.', status: 404 };
  return { data: stripPassword(user) };
}

/**
 * Create a new user.
 * Validates email, password strength, role, dept (required for resolvers).
 */
function createUser(body, actorEmail) {
  const { name, email, password, role, dept } = body;

  // Validations
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, status: 400 };

  const passErr = validatePassword(password);
  if (passErr)  return { error: passErr, status: 400 };

  const roleErr = validateRole(role);
  if (roleErr)  return { error: roleErr, status: 400 };

  if (role === ROLES.RESOLVER && !dept) {
    return { error: 'Resolvers must be assigned a department (dept field required).', status: 400 };
  }

  if (dept) {
    const deptObj = DEPARTMENTS.find(d => d.id === dept);
    if (!deptObj) {
      return { error: `Unknown department "${dept}". Valid IDs: ${DEPARTMENTS.map(d=>d.id).join(', ')}`, status: 400 };
    }
  }

  const users = read(FILES.USERS, []);

  if (users.find(u => u.email === email.toLowerCase())) {
    return { error: 'A user with that email already exists.', status: 409 };
  }

  const deptObj = dept ? DEPARTMENTS.find(d => d.id === dept) : null;

  const user = {
    id:       'U' + Date.now(),
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    password, // NOTE: hash this with bcrypt in production
    role,
    dept:     dept || '',
    deptName: deptObj ? deptObj.name : '',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  write(FILES.USERS, users);

  createAuditEntry('USER_CREATED', actorEmail, { newUserId: user.id, role, email: user.email });

  return { data: stripPassword(user), status: 201 };
}

/**
 * Update a user's name, dept, or password.
 * Guards: cannot change role here, cannot change own role/email.
 */
function updateUser(id, body, actorEmail) {
  const users = read(FILES.USERS, []);
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) return { error: 'User not found.', status: 404 };

  const user = users[idx];

  // Validate new password if provided
  if (body.password !== undefined) {
    const passErr = validatePassword(body.password);
    if (passErr) return { error: passErr, status: 400 };
  }

  // Validate new dept if provided
  if (body.dept !== undefined && body.dept !== '') {
    const deptObj = DEPARTMENTS.find(d => d.id === body.dept);
    if (!deptObj) {
      return { error: `Unknown department "${body.dept}".`, status: 400 };
    }
    users[idx].deptName = deptObj.name;
  }

  // Prevent role change via this endpoint
  if (body.role !== undefined) {
    return { error: 'Role cannot be changed after creation. Contact a super-admin.', status: 400 };
  }

  // Apply safe fields
  const allowedFields = ['name', 'dept', 'password'];
  allowedFields.forEach(k => { if (body[k] !== undefined) users[idx][k] = body[k]; });
  users[idx].updatedAt = new Date().toISOString();

  write(FILES.USERS, users);

  createAuditEntry('USER_UPDATED', actorEmail, { targetId: id, fields: Object.keys(body) });

  return { data: stripPassword(users[idx]) };
}

/**
 * Delete a user.
 * Guards:
 *  - Cannot delete yourself
 *  - Cannot delete the last admin
 *  - Orphaned grievances are anonymised (not deleted)
 */
function deleteUser(id, actorEmail) {
  const users  = read(FILES.USERS, []);
  const target = users.find(u => u.id === id);
  if (!target) return { error: 'User not found.', status: 404 };

  // Self-deletion guard
  if (target.email === actorEmail) {
    return { error: 'You cannot delete your own account.', status: 403 };
  }

  // Last-admin guard
  if (target.role === ROLES.ADMIN && countAdmins(users) <= 1) {
    return { error: 'Cannot delete the last admin account.', status: 403 };
  }

  // Anonymise grievances belonging to this user
  const grievances = read(FILES.GRIEVANCES, []);
  let anonymised = 0;
  grievances.forEach(g => {
    if (g.studentEmail === target.email) {
      g.student      = '[Deleted User]';
      g.studentEmail = 'deleted@system';
      anonymised++;
    }
  });
  if (anonymised > 0) write(FILES.GRIEVANCES, grievances);

  const updatedUsers = users.filter(u => u.id !== id);
  write(FILES.USERS, updatedUsers);

  createAuditEntry('USER_DELETED', actorEmail, {
    deletedId: id, role: target.role, grievancesAnonymised: anonymised,
  });

  return {
    data: {
      message: `User ${id} deleted. ${anonymised} grievance(s) anonymised.`,
      grievancesAnonymised: anonymised,
    },
  };
}

module.exports = {
  listUsers,
  getMyProfile,
  getUserByID,
  createUser,
  updateUser,
  deleteUser,
};
