/* ══════════════════════════════════════════
   ResolveIt — Shared Data & Utilities
   ══════════════════════════════════════════ */

// ── DEPARTMENTS ───────────────────────────
const DEPARTMENTS = [
  { id:'ACAD', name:'Academic Department',        icon:'📚', desc:'Exams, results, curriculum, faculty issues' },
  { id:'ADMN', name:'Administration Department',  icon:'🏛️', desc:'Fees, certificates, admissions, records' },
  { id:'TECH', name:'IT / Technical Department',  icon:'💻', desc:'Internet, computers, software, lab issues' },
  { id:'HOST', name:'Hostel Department',          icon:'🏠', desc:'Rooms, food, water, hostel facilities' },
  { id:'TRAN', name:'Transport Department',       icon:'🚌', desc:'Bus routes, schedules, transport issues' },
  { id:'LIBR', name:'Library Department',         icon:'📖', desc:'Books, resources, library access' },
  { id:'FINC', name:'Finance Department',         icon:'💰', desc:'Scholarships, refunds, fee issues' },
  { id:'SPRT', name:'Sports Department',          icon:'⚽', desc:'Sports facilities, equipment, events' },
];

function getDepartments() { return DEPARTMENTS; }
function getDept(id) { return DEPARTMENTS.find(d => d.id === id) || { id, name: id, icon: '📁', desc: '' }; }

// ── SAMPLE DATA ───────────────────────────
const GRIEVANCES_KEY = 'ri_grievances';
const USERS_KEY      = 'ri_users';
const FEEDBACK_KEY   = 'ri_feedback';

const defaultGrievances = [
  { id:'GRV1001', subject:'WiFi not working in Lab 3',       dept:'TECH', deptName:'IT / Technical Department', category:'IT / Technical Department', desc:'Internet has been down for 3 days in Computer Lab 3.', status:'Resolved',    date:'2025-01-10', student:'Priya S.' },
  { id:'GRV1002', subject:'Hostel water supply issue',       dept:'HOST', deptName:'Hostel Department',          category:'Hostel Department',          desc:'No water supply since yesterday morning in Block C.', status:'In Progress', date:'2025-01-14', student:'Arjun K.' },
  { id:'GRV1003', subject:'Exam schedule conflict',          dept:'ACAD', deptName:'Academic Department',        category:'Academic Department',        desc:'Two exams scheduled at the same time — CS301 and MA201.', status:'Pending',  date:'2025-01-18', student:'Demo User' },
  { id:'GRV1004', subject:'Library reference books missing', dept:'LIBR', deptName:'Library Department',         category:'Library Department',         desc:'Reference books removed from shelf without notice.', status:'Forwarded',   date:'2025-01-20', student:'Meena R.' },
  { id:'GRV1005', subject:'Bus route changed without notice',dept:'TRAN', deptName:'Transport Department',       category:'Transport Department',       desc:'Route 4B changed causing 2-hour delays for students.', status:'Pending',   date:'2025-01-22', student:'Ravi K.' },
  { id:'GRV1006', subject:'Fee payment portal error',        dept:'FINC', deptName:'Finance Department',         category:'Finance Department',         desc:'Portal shows server error when paying semester fees.', status:'In Progress',date:'2025-01-24', student:'Sneha P.' },
];

const defaultUsers = [
  { id:'U01', name:'Prof. Ramesh Kumar', email:'ramesh@college.edu', role:'resolver',   dept:'ACAD', deptName:'Academic Department' },
  { id:'U02', name:'Mr. Suresh Nair',    email:'suresh@college.edu', role:'resolver',   dept:'HOST', deptName:'Hostel Department' },
  { id:'U03', name:'Ms. Anitha Rao',     email:'anitha@college.edu', role:'resolver',   dept:'TECH', deptName:'IT / Technical Department' },
  { id:'U04', name:'Priya S.',           email:'priya@student.edu',  role:'student', dept:'',     deptName:'' },
  { id:'U05', name:'Arjun K.',           email:'arjun@student.edu',  role:'student', dept:'',     deptName:'' },
  { id:'U06', name:'Meena R.',           email:'meena@student.edu',  role:'student', dept:'',     deptName:'' },
];

// ── STORAGE HELPERS ───────────────────────
function getData(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function setData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getGrievances()       { return getData(GRIEVANCES_KEY, defaultGrievances); }
function saveGrievances(arr)   { setData(GRIEVANCES_KEY, arr); }
function getUsers()            { return getData(USERS_KEY, defaultUsers); }
function saveUsers(arr)        { setData(USERS_KEY, arr); }
function getFeedbacks()        { return getData(FEEDBACK_KEY, []); }
function saveFeedbacks(arr)    { setData(FEEDBACK_KEY, arr); }

// ── SESSION ───────────────────────────────
function getSession()    { return getData('ri_session', null); }
function setSession(obj) { setData('ri_session', obj); }
function clearSession()  { localStorage.removeItem('ri_session'); }

// ── UTILITIES ─────────────────────────────
function generateID() { return 'GRV' + (1000 + Math.floor(Math.random() * 9000)); }
function capitalise(str) {
  return str.replace(/_/g,' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function today() { return new Date().toISOString().split('T')[0]; }

function statusBadge(s) {
  const map = {
    'Pending':'s-pending','In Progress':'s-progress',
    'Resolved':'s-resolved','Forwarded':'s-forwarded','Forwarded to Admin':'s-forwarded',
  };
  return `<span class="status ${map[s]||'s-pending'}">${s}</span>`;
}

function deptTag(deptId) {
  const d = getDept(deptId);
  return `<span class="dept-tag">${d.icon} ${d.name}</span>`;
}

// ── TOAST ─────────────────────────────────
let toastTimer;
function toast(msg, isError = false) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
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
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ── INJECT MODAL + TOAST ──────────────────
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

/* ══════════════════════════════════════════
   ResolveIt — Backend API Client
   Connects to Express backend on /api/*
   Falls back to localStorage when offline.
   ══════════════════════════════════════════ */

const API_BASE = '/api';

// ── Token helpers ─────────────────────────
function getToken()      { return localStorage.getItem('ri_token') || ''; }
function storeToken(t)   { localStorage.setItem('ri_token', t); }
function clearToken()    { localStorage.removeItem('ri_token'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

// ── Generic fetch wrapper ─────────────────
async function apiFetch(path, options = {}) {
  try {
    const resp = await fetch(API_BASE + path, {
      headers: authHeaders(),
      ...options,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || resp.statusText);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Auth ──────────────────────────────────
async function apiLogin(email, password) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) { storeToken(res.data.token); setSession(res.data.user); }
  return res;
}

function apiLogout() { clearToken(); clearSession(); }

async function apiRegister(name, email, password) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  if (res.ok) { storeToken(res.data.token); setSession(res.data.user); }
  return res;
}

// ── Grievances ────────────────────────────
async function apiGetGrievances(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiFetch('/grievances' + (params ? '?' + params : ''));
}

async function apiGetGrievance(id) { return apiFetch('/grievances/' + id); }

async function apiSubmitGrievance(payload) {
  return apiFetch('/grievances', { method: 'POST', body: JSON.stringify(payload) });
}

async function apiUpdateGrievance(id, patch) {
  return apiFetch('/grievances/' + id, { method: 'PATCH', body: JSON.stringify(patch) });
}

async function apiDeleteGrievance(id) {
  return apiFetch('/grievances/' + id, { method: 'DELETE' });
}

// ── Users ─────────────────────────────────
async function apiGetUsers(role) {
  return apiFetch('/users' + (role ? '?role=' + role : ''));
}

async function apiAddUser(payload) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) });
}

async function apiDeleteUser(id) {
  return apiFetch('/users/' + id, { method: 'DELETE' });
}

// ── Feedback ──────────────────────────────
async function apiGetFeedback()      { return apiFetch('/feedback'); }
async function apiSubmitFeedback(p)  {
  return apiFetch('/feedback', { method: 'POST', body: JSON.stringify(p) });
}

// ── Stats ─────────────────────────────────
async function apiGetStats()         { return apiFetch('/stats'); }

// ── Departments (cached) ──────────────────
async function apiGetDepartments() { return apiFetch('/departments'); }
