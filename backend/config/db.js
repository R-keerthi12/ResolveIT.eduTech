/**
 * config/db.js
 * Lightweight JSON file persistence layer.
 * Provides read / write helpers and seeds default data on first run.
 */

const fs   = require('fs');
const path = require('path');
const { DATA_DIR, FILES } = require('./constants');

// ── Ensure data directory exists ─────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Read a JSON data file. Returns `defaultValue` when file is absent or corrupt.
 * @param {string} filename
 * @param {*} defaultValue
 */
function read(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    console.warn(`[db] Could not parse ${filename}, returning default.`);
    return defaultValue;
  }
}

/**
 * Write data to a JSON file (pretty-printed, atomic-ish).
 * @param {string} filename
 * @param {*} data
 */
function write(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  const tmp      = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Seed default data ────────────────────────────────────────────────────────
function seed() {
  if (!fs.existsSync(path.join(DATA_DIR, FILES.USERS))) {
    write(FILES.USERS, [
      { id: 'U00', name: 'Admin',              email: 'admin@college.edu',  password: 'admin123', role: 'admin',    dept: '',     deptName: '' },
      { id: 'U01', name: 'Prof. Ramesh Kumar', email: 'ramesh@college.edu', password: 'pass123',  role: 'resolver', dept: 'ACAD', deptName: 'Academic Department' },
      { id: 'U02', name: 'Mr. Suresh Nair',    email: 'suresh@college.edu', password: 'pass123',  role: 'resolver', dept: 'HOST', deptName: 'Hostel Department' },
      { id: 'U03', name: 'Ms. Anitha Rao',     email: 'anitha@college.edu', password: 'pass123',  role: 'resolver', dept: 'TECH', deptName: 'IT / Technical Department' },
      { id: 'U04', name: 'Priya S.',           email: 'priya@student.edu',  password: 'pass123',  role: 'student',  dept: '',     deptName: '' },
      { id: 'U05', name: 'Arjun K.',           email: 'arjun@student.edu',  password: 'pass123',  role: 'student',  dept: '',     deptName: '' },
      { id: 'U06', name: 'Meena R.',           email: 'meena@student.edu',  password: 'pass123',  role: 'student',  dept: '',     deptName: '' },
    ]);
    console.log('[db] Seeded users.json');
  }

  if (!fs.existsSync(path.join(DATA_DIR, FILES.GRIEVANCES))) {
    write(FILES.GRIEVANCES, [
      { id: 'GRV1001', subject: 'WiFi not working in Lab 3',        dept: 'TECH', deptName: 'IT / Technical Department', category: 'IT / Technical Department', desc: 'Internet has been down for 3 days in Computer Lab 3.',     status: 'Resolved',     priority: 'High',   date: '2025-01-10', student: 'Priya S.',  studentEmail: 'priya@student.edu',  remarks: 'Fixed router configuration.' },
      { id: 'GRV1002', subject: 'Hostel water supply issue',        dept: 'HOST', deptName: 'Hostel Department',         category: 'Hostel Department',         desc: 'No water supply since yesterday morning in Block C.',      status: 'In Progress', priority: 'Urgent', date: '2025-01-14', student: 'Arjun K.', studentEmail: 'arjun@student.edu',  remarks: 'Plumber dispatched.' },
      { id: 'GRV1003', subject: 'Exam schedule conflict',           dept: 'ACAD', deptName: 'Academic Department',       category: 'Academic Department',        desc: 'Two exams scheduled at the same time — CS301 and MA201.',  status: 'Pending',     priority: 'Normal', date: '2025-01-18', student: 'Demo User', studentEmail: 'demo@student.edu',   remarks: '' },
      { id: 'GRV1004', subject: 'Library reference books missing',  dept: 'LIBR', deptName: 'Library Department',        category: 'Library Department',         desc: 'Reference books removed from shelf without notice.',       status: 'Forwarded',   priority: 'Normal', date: '2025-01-20', student: 'Meena R.', studentEmail: 'meena@student.edu',  remarks: 'Forwarded to head librarian.' },
      { id: 'GRV1005', subject: 'Bus route changed without notice', dept: 'TRAN', deptName: 'Transport Department',      category: 'Transport Department',        desc: 'Route 4B changed, causing 2-hour delays for students.',    status: 'Pending',     priority: 'High',   date: '2025-01-22', student: 'Ravi K.',  studentEmail: 'ravi@student.edu',   remarks: '' },
      { id: 'GRV1006', subject: 'Fee payment portal error',         dept: 'FINC', deptName: 'Finance Department',        category: 'Finance Department',          desc: 'Portal shows server error when paying semester fees.',      status: 'In Progress', priority: 'Urgent', date: '2025-01-24', student: 'Sneha P.', studentEmail: 'sneha@student.edu',  remarks: 'IT team investigating.' },
    ]);
    console.log('[db] Seeded grievances.json');
  }

  if (!fs.existsSync(path.join(DATA_DIR, FILES.FEEDBACK))) {
    write(FILES.FEEDBACK, []);
    console.log('[db] Seeded feedback.json');
  }
}

seed();

module.exports = { read, write };
