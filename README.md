# ResolveIt — College Grievance Portal

A full-stack college grievance management system with AI-powered features, email notifications, and Google OAuth login.

## Features

- 🎓 **Student Portal** — Submit grievances, track status, receive email updates
- 👨‍💼 **Admin Portal** — Manage all complaints, bulk updates, user management
- 👨‍🏫 **Resolver Portal** — View and resolve assigned department complaints
- ✅ **Email Notifications** — Students get emailed on every status change (SendGrid)
- ✨ **AI Features** — Auto department suggestion, AI reply generator (Claude API)
- 🔐 **Google OAuth** — Login with Google college account
- 📊 **Dashboard** — Real-time stats, department breakdown, audit logs

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: JSON file-based persistence
- **Email**: SendGrid
- **AI**: Anthropic Claude API
- **Auth**: JWT + Google OAuth 2.0

## Setup & Run

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/resolveit.git
cd resolveit/backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
copy .env.example .env    # Windows
# OR
cp .env.example .env      # Mac/Linux
```

Edit `.env` and fill in your API keys (see below).

### 4. Start the server
```bash
npm run dev     # development (auto-restart)
# OR
npm start       # production
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `SENDGRID_API_KEY` | For emails | Get free at [sendgrid.com](https://sendgrid.com) |
| `EMAIL_FROM` | For emails | Sender address e.g. `ResolveIt <noreply@college.edu>` |
| `ANTHROPIC_API_KEY` | For AI | Get at [console.anthropic.com](https://console.anthropic.com) |
| `GOOGLE_CLIENT_ID` | For Google login | From [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | For Google login | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | For Google login | `http://localhost:3000/api/auth/google/callback` |
| `SESSION_SECRET` | For Google login | Any random string |

> **Note**: All APIs are optional. The app works without them — emails/AI/Google login are silently skipped if keys are not set.

---

## Default Users (first run)

Create users via the Admin portal → Manage Users, or seed manually in `backend/data/users.json`:

```json
[
  { "id": "U1", "name": "Admin User", "email": "admin@college.edu", "password": "admin123", "role": "admin", "dept": "" },
  { "id": "U2", "name": "Resolver One", "email": "resolver@college.edu", "password": "resolver123", "role": "resolver", "dept": "ACAD" }
]
```

Students register themselves via the Sign Up page.

---

## API Keys — How to Get Them

### SendGrid (Email)
1. Go to [sendgrid.com](https://sendgrid.com) → Sign up free
2. Settings → API Keys → Create API Key
3. Copy and paste into `SENDGRID_API_KEY`

### Anthropic Claude AI
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Copy and paste into `ANTHROPIC_API_KEY`

### Google OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web Application
4. Add `http://localhost:3000/api/auth/google/callback` to Authorized Redirect URIs
5. Copy Client ID and Client Secret

---

## Deploying to Render (Free Hosting)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add all environment variables in Render dashboard
6. Deploy ✅

---

## Project Structure

```
resolveit_v2/
├── index.html                  # Landing page
├── student/                    # Student portal pages
│   ├── student-login.html
│   ├── student-signup.html
│   ├── student-dashboard.html
│   ├── submit-grievance.html
│   ├── track-status.html
│   └── give-feedback.html
├── admin/                      # Admin portal pages
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── all-complaints.html
│   └── manage-users.html
├── resolver/                   # Resolver portal pages
│   ├── resolver-login.html
│   ├── resolver-dashboard.html
│   ├── view-assigned.html
│   └── update-status.html
├── assets/
│   ├── css/style.css
│   └── js/data.js              # API client & helpers
└── backend/
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── routes/
    ├── services/
    │   ├── emailService.js     # SendGrid emails
    │   ├── aiService.js        # Claude AI features
    │   ├── authService.js      # JWT + registration
    │   └── grievanceService.js
    └── data/                   # JSON file storage
```
