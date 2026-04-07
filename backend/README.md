# ResolveIt — Backend API

A lightweight Node.js / Express backend for the ResolveIt grievance portal.
Data is persisted as JSON files inside the `data/` folder (auto-created on first run).

---

## Setup & Run

```bash
cd backend
npm install
npm start          # production
# or
npm run dev        # auto-restart with nodemon
```

The server starts on **http://localhost:3000**.
The frontend is served at the same origin; no separate web server needed.

---

## Authentication

Login returns a `token`.  Pass it on every subsequent request:

```
Authorization: Bearer <token>
```

Tokens are `base64(email:role)` — simple for demo purposes.

---

## Endpoints

### Auth
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ user, token }` |

### Grievances
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/grievances` | any | Query params: `dept`, `status`, `priority`. Students only see own. |
| GET | `/api/grievances/:id` | any | |
| POST | `/api/grievances` | student / admin | Body: `{ subject, dept, desc, priority? }` |
| PATCH | `/api/grievances/:id` | resolver / admin | Body: `{ status?, priority?, remarks? }` |
| DELETE | `/api/grievances/:id` | admin | |

### Users
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/users` | admin | Query: `role` filter |
| POST | `/api/users` | admin | Body: `{ name, email, password, role, dept? }` |
| DELETE | `/api/users/:id` | admin | |

### Feedback
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/feedback` | admin / resolver | |
| POST | `/api/feedback` | student | Body: `{ grievanceId, rating, message? }` |

### Misc
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/departments` | none | Static department list |
| GET | `/api/stats` | any | Summary counts & dept breakdown |

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | admin123 |
| Resolver | ramesh@college.edu | pass123 |
| Resolver | suresh@college.edu | pass123 |
| Resolver | anitha@college.edu | pass123 |
| Student | priya@student.edu | pass123 |
| Student | arjun@student.edu | pass123 |
| Student | meena@student.edu | pass123 |

Credentials are seeded into `data/users.json` on first run (file is not overwritten if it already exists).
