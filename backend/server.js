/**
 * server.js — ResolveIt entry point
 */

require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const session        = require('express-session');
const { PORT }       = require('./config/constants');

// ── Middleware ────────────────────────────────────────────────────────────────
const requestLogger  = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler   = require('./middleware/errorHandler');
const respond        = require('./middleware/respond');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const grievanceRoutes  = require('./routes/grievances');
const userRoutes       = require('./routes/users');
const feedbackRoutes   = require('./routes/feedback');
const departmentRoutes = require('./routes/departments');
const statsRoutes      = require('./routes/stats');
const auditRoutes      = require('./routes/audit');
const adminRoutes      = require('./routes/admin');
const aiRoutes         = require('./routes/ai');
const { router: googleAuthRouter, passport } = require('./routes/googleAuth');

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(requestLogger);    // log every request
app.use(respond);          // attach res.ok() and res.fail()
app.use(apiLimiter);       // 120 req/min per IP across all API routes

// Session (needed for passport)
app.use(session({ secret: process.env.SESSION_SECRET || 'resolveit_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());

// Serve the frontend static files
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/grievances',  grievanceRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/feedback',    feedbackRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/stats',       statsRoutes);
app.use('/api/audit',       auditRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/auth',        googleAuthRouter);   // Google OAuth (merged with existing /api/auth)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
);

// ── Documentation ─────────────────────────────────────────────────────────────
app.get('/docs', (req, res) =>
  res.sendFile(path.join(__dirname, 'docs', 'api-docs.html'))
);

// ── API 404 ───────────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) =>
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` })
);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.sendFile(path.join(__dirname, '..', 'index.html'))
);

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     ResolveIt Backend  🚀                ║');
  console.log(`  ║     http://localhost:${PORT}                ║`);
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  Frontend   → http://localhost:${PORT}/     ║`);
  console.log(`  ║  API        → /api/                      ║`);
  console.log(`  ║  Docs       → /docs                      ║`);
  console.log(`  ║  Admin      → /api/admin  (admin role)   ║`);
  console.log(`  ║  Audit      → /api/audit  (admin role)   ║`);
  console.log(`  ║  Health     → /api/health                ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
