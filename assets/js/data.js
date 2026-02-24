/* ══════════════════════════════════════════
   ResolveIt — Shared Data & Utilities
   ══════════════════════════════════════════ */

// ── SAMPLE DATA ──────────────────────────
const GRIEVANCES_KEY = 'ri_grievances';
const USERS_KEY      = 'ri_users';
const FEEDBACK_KEY   = 'ri_feedback';

const defaultGrievances = [
  { id:'GRV1001', subject:'WiFi not working in Lab 3',  category:'Technical', desc:'Internet has been down for 3 days in Computer Lab 3.', status:'Resolved',    date:'2025-01-10', student:'Priya S.' },
  { id:'GRV1002', subject:'Hostel water supply issue',  category:'Hostel',    desc:'No water supply since yesterday morning in Block C.', status:'In Progress', date:'2025-01-14', student:'Arjun K.' },
  { id:'GRV1003', subject:'Exam schedule conflict',     category:'Academic',  desc:'Two exams scheduled at the same time — CS301 and MA201.', status:'Pending',     date:'2025-01-18', student:'Demo User' },
  { id:'GRV1004', subject:'Library reference books missing', category:'Academic', desc:'Reference books removed from shelf without notice.', status:'Forwarded',   date:'2025-01-20', student:'Meena R.' },
];

const defaultUsers = [
  { id:'U01', name:'Prof. Ramesh Kumar', email:'ramesh@college.edu', role:'staff',   dept:'Academic' },
  { id:'U02', name:'Mr. Suresh Nair',    email:'suresh@college.edu', role:'staff',   dept:'Hostel' },
  { id:'U03', name:'Priya S.',           email:'priya@student.edu',  role:'student', dept:'' },
  { id:'U04', name:'Arjun K.',           email:'arjun@student.edu',  role:'student', dept:'' },
  { id:'U05', name:'Meena R.',           email:'meena@student.edu',  role:'student', dept:'' },
];

// ── STORAGE HELPERS ───────────────────────
function getData(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}
function setData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getGrievances() { return getData(GRIEVANCES_KEY, defaultGrievances); }
function saveGrievances(arr) { setData(GRIEVANCES_KEY, arr); }
function getUsers()      { return getData(USERS_KEY, defaultUsers); }
function saveUsers(arr)  { setData(USERS_KEY, arr); }
function getFeedbacks()  { return getData(FEEDBACK_KEY, []); }
function saveFeedbacks(arr) { setData(FEEDBACK_KEY, arr); }

// ── SESSION ───────────────────────────────
function getSession()           { return getData('ri_session', null); }
function setSession(obj)        { setData('ri_session', obj); }
function clearSession()         { localStorage.removeItem('ri_session'); }

// ── UTILITIES ─────────────────────────────
function generateID() {
  return 'GRV' + (1000 + Math.floor(Math.random() * 9000));
}

function capitalise(str) {
  return str.replace(/_/g,' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function statusBadge(s) {
  const map = {
    'Pending':            's-pending',
    'In Progress':        's-progress',
    'Resolved':           's-resolved',
    'Forwarded':          's-forwarded',
    'Forwarded to Admin': 's-forwarded',
  };
  return `<span class="status ${map[s] || 's-pending'}">${s}</span>`;
}

// ── TOAST ─────────────────────────────────
let toastTimer;
function toast(msg, isError = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  // Force reflow
  void el.offsetWidth;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── MODAL ─────────────────────────────────
let _modalCb = null;
function showModal(title, body, cb) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  _modalCb = cb;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-confirm').onclick = () => { closeModal(); if (_modalCb) _modalCb(); };
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── MODAL HTML (inject once) ──────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('modal-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">
        <h3 id="modal-title">Confirm Action</h3>
        <p  id="modal-body">Are you sure you want to proceed?</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="modal-confirm">Confirm</button>
        </div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
  `);
});
