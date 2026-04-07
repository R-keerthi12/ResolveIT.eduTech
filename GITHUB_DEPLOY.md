# How to Upload & Deploy ResolveIt on GitHub

## Step 1 — Create GitHub Repository

1. Go to [github.com](https://github.com) → Sign in
2. Click **"New"** (green button, top left)
3. Repository name: `resolveit`
4. Set to **Public** or Private
5. ❌ Do NOT check "Add README" (we already have one)
6. Click **"Create repository"**

---

## Step 2 — Upload to GitHub (Windows)

Open **Command Prompt** or **PowerShell** in the `resolveit_v2` folder:

```bash
# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit — ResolveIt Grievance Portal"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/resolveit.git

# Push to GitHub
git branch -M main
git push -u origin main
```

> If asked for password, use a **GitHub Personal Access Token**:
> GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token

---

## Step 3 — Deploy for Free on Render

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your `resolveit` GitHub repo
4. Fill in:
   | Field | Value |
   |-------|-------|
   | Name | resolveit |
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

5. Click **"Advanced"** → **"Add Environment Variable"** and add:
   ```
   SENDGRID_API_KEY = your_key_here
   EMAIL_FROM       = ResolveIt <your@email.com>
   ANTHROPIC_API_KEY = your_key_here
   SESSION_SECRET   = any_random_string_here
   ```

6. Click **"Create Web Service"**
7. Wait 2-3 minutes → Your app is live at `https://resolveit.onrender.com` ✅

---

## Step 4 — Update Google OAuth for production

Once deployed on Render, update your Google OAuth callback URL:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Your OAuth Client
3. Add to Authorized Redirect URIs:
   ```
   https://resolveit.onrender.com/api/auth/google/callback
   ```
4. In Render dashboard, update:
   ```
   GOOGLE_CALLBACK_URL = https://resolveit.onrender.com/api/auth/google/callback
   ```

---

## Pushing future updates

```bash
git add .
git commit -m "describe your changes"
git push
```
Render auto-deploys every time you push to `main` ✅
