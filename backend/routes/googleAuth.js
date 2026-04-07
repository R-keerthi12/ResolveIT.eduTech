/**
 * routes/googleAuth.js — Google OAuth 2.0
 *
 * GET /api/auth/google           → redirect to Google login
 * GET /api/auth/google/callback  → Google redirects here after login
 * GET /api/auth/google/failure   → login failed
 */
require('dotenv').config();
const router   = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { read, write } = require('../config/db');
const { FILES, ROLES } = require('../config/constants');

// ── Configure Google Strategy ─────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const name  = profile.displayName;
      if (!email) return done(new Error('No email from Google'));

      // Find or create user
      const users = read(FILES.USERS, []);
      let user = users.find(u => u.email === email);
      if (!user) {
        user = {
          id:        'U' + Date.now(),
          name,
          email,
          password:  '',           // no password for Google users
          role:      ROLES.STUDENT,
          dept:      '',
          deptName:  '',
          googleId:  profile.id,
          avatar:    profile.photos?.[0]?.value || '',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        write(FILES.USERS, users);
      }
      return done(null, user);
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const users = read(FILES.USERS, []);
    done(null, users.find(u => u.id === id) || null);
  });
}

// ── Build token (same format as authService) ──────────────────────────────────
function buildToken(email, role) {
  const payload = `${email}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString('base64');
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env' });
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  (req, res) => {
    const user  = req.user;
    const token = buildToken(user.email, user.role);

    // Redirect to frontend with token in query param
    // Frontend reads it and stores in localStorage
    const redirectBase = user.role === 'student'
      ? '/student/student-dashboard.html'
      : '/index.html';

    res.redirect(`${redirectBase}?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}`);
  }
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ error: 'Google login failed. Please try again.' });
});

module.exports = { router, passport };
