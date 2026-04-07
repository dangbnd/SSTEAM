# Deploying SSTEAM to Render + MongoDB Atlas

This guide walks you through deploying the SSTEAM application on a **paid Render Web Service** with a **persistent disk** and **MongoDB Atlas** as the production database.

---

## Prerequisites

- A [Render](https://render.com) account (paid plan — Starter or higher)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free tier M0 is fine to start)
- Git — the repo pushed to GitHub or GitLab
- Node.js 18+ installed locally (for testing)

---

## 1. MongoDB Atlas Setup

### 1.1 Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **"Build a Database"**
3. Choose **M0 (Free)** or a paid tier depending on your needs
4. Select a cloud provider and region close to your Render region (e.g. AWS Singapore if using Render Singapore)
5. Name the cluster (e.g. `ssteam-cluster`)
6. Click **"Create Cluster"**

### 1.2 Create a Database User

1. Go to **Database Access** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Set username (e.g. `ssteam_app`) and generate a strong password
5. Under **Database User Privileges**, select **"Read and write to any database"**
6. Click **"Add User"**

> ⚠️ **Save the password** — you'll need it for the connection string.

### 1.3 Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (sets `0.0.0.0/0`)
   - This is required because Render's outbound IPs are dynamic
   - Atlas still requires username + password authentication
4. Click **"Confirm"**

### 1.4 Get the Connection String

1. Go to **Database** → click **"Connect"** on your cluster
2. Choose **"Drivers"**
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://ssteam_app:<password>@ssteam-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with the password from step 1.2

### 1.5 Import Data (Optional)

If you have existing data to import from local MongoDB:

```bash
# Export from local
npm run db:export:full

# Then import to Atlas — set env vars pointing to Atlas
MONGO_URI="mongodb+srv://ssteam_app:<password>@ssteam-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
DB_NAME="stem_steam_education" \
npm run db:import:full
```

On Windows PowerShell:
```powershell
$env:MONGO_URI = "mongodb+srv://ssteam_app:<password>@ssteam-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority"
$env:DB_NAME = "stem_steam_education"
npm run db:import:full
```

Or run the seed scripts for a fresh database:
```bash
npm run seed:products
npm run seed:tutorial-categories
npm run seed:tutorials
```

---

## 2. Render Setup

### 2.1 Option A: Blueprint Deployment (Recommended)

1. Push this repo to GitHub/GitLab (make sure `render.yaml` is committed)
2. In Render Dashboard → **New** → **Blueprint**
3. Connect your repo
4. Render will detect `render.yaml` and create the service automatically
5. Fill in the env vars that are marked `sync: false` (see section 3)
6. Click **"Apply"**

### 2.2 Option B: Manual Setup

1. In Render Dashboard → **New** → **Web Service**
2. Connect your GitHub/GitLab repo
3. Configure:

| Setting           | Value                      |
|-------------------|----------------------------|
| **Name**          | `ssteam-web`               |
| **Region**        | Singapore (or your choice) |
| **Runtime**       | Node                       |
| **Build Command** | `npm install`              |
| **Start Command** | `npm start`                |
| **Plan**          | Starter (paid)             |

4. Add **Persistent Disk**:
   - Name: `ssteam-media`
   - Mount Path: `/opt/render/media`
   - Size: 1 GB (adjust as needed)

5. Set **Health Check Path**: `/healthz`

6. Add environment variables (see section 3)

7. Click **"Create Web Service"**

---

## 3. Environment Variables

Set these in the Render dashboard under your service → **Environment**:

| Variable              | Required | Example Value                                                                 |
|-----------------------|----------|-------------------------------------------------------------------------------|
| `NODE_ENV`            | ✅       | `production`                                                                  |
| `MONGO_URI`           | ✅       | `mongodb+srv://ssteam_app:xxx@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME`             | ✅       | `stem_steam_education`                                                        |
| `JWT_SECRET`          | ✅       | (generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `MEDIA_ROOT`          | ✅       | `/opt/render/media`                                                           |
| `ADMIN_USERNAME`      | ✅       | `admin`                                                                       |
| `ADMIN_PASSWORD`      | ✅       | (strong password)                                                             |
| `CORS_ORIGIN`         | ⚠️       | `https://smartsteam.vn,https://www.smartsteam.vn`                             |
| `GOOGLE_CLIENT_ID`    | Optional | (from Google Cloud Console)                                                   |
| `GOOGLE_CLIENT_SECRET`| Optional | (from Google Cloud Console)                                                   |
| `GOOGLE_REDIRECT_URI` | Optional | `https://ssteam-web.onrender.com/api/auth/google/callback`                    |
| `MAIL_SERVICE`        | Optional | `gmail`                                                                       |
| `MAIL_USER`           | Optional | `your-email@gmail.com`                                                        |
| `MAIL_PASS`           | Optional | (Gmail App Password)                                                          |
| `MAIL_FROM`           | Optional | `"Smart Steam <no-reply@smartsteam.vn>"`                                      |
| `CONTACT_EMAIL_TO`    | Optional | `support@smartsteam.vn`                                                       |

> **Notes:**
> - `PORT` is set automatically by Render — do not set it manually
> - `JWT_SECRET` can be auto-generated if using Blueprint (`generateValue: true`)
> - `CORS_ORIGIN` should include your custom domain if you have one

---

## 4. Post-Deploy Verification

After Render finishes building and deploying:

### 4.1 Health Check
```bash
curl https://ssteam-web.onrender.com/healthz
```
Expected response:
```json
{
  "status": "ok",
  "uptime": 12.345,
  "timestamp": "2026-04-01T12:00:00.000Z",
  "db": "connected"
}
```

### 4.2 Verify Static Assets
- Visit `https://ssteam-web.onrender.com/` — homepage should load
- Check that CSS, JS, and images render correctly

### 4.3 Verify Admin Login
- Visit `https://ssteam-web.onrender.com/admin-login`
- Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- Try uploading an image — confirm it persists after navigating away

### 4.4 Verify Media Persistence
1. Upload an image through the admin panel
2. Note the image URL (e.g. `/images/test-12345.webp`)
3. Trigger a manual redeploy in Render
4. After redeploy, verify the image URL still works

### 4.5 Verify Database
```bash
curl https://ssteam-web.onrender.com/api/products
```
Should return products from MongoDB Atlas.

---

## 5. Custom Domain (Optional)

1. In Render Dashboard → your service → **Settings** → **Custom Domains**
2. Add your domain (e.g. `smartsteam.vn`)
3. Configure DNS as instructed by Render
4. Update `CORS_ORIGIN` to include the custom domain
5. Update `GOOGLE_REDIRECT_URI` if using Google OAuth

---

## 6. Common Issues & Fixes

### App crashes on startup
**Check Render logs.** Common causes:
- Missing required env vars (`MONGO_URI`, `DB_NAME`, `JWT_SECRET`) — the app logs which are missing before exiting
- MongoDB Atlas network access not configured for `0.0.0.0/0`
- Wrong password in `MONGO_URI`

### Images disappear after redeploy
- Confirm `MEDIA_ROOT` is set to `/opt/render/media`
- Confirm the persistent disk is mounted at `/opt/render/media`
- Check Render dashboard → service → Disks to verify the disk is attached

### MongoDB connection timeout
- Verify Atlas cluster is running
- Verify your Atlas connection string is correct (no `<password>` placeholder left)
- Verify Network Access allows `0.0.0.0/0`
- Check that your Atlas region is close to your Render region

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify `GOOGLE_REDIRECT_URI` matches the production URL exactly
- In Google Cloud Console → Credentials → OAuth 2.0 Client → add the redirect URI

### Contact form / email not working
- Verify `MAIL_USER`, `MAIL_PASS`, `MAIL_SERVICE` are set
- For Gmail, use an **App Password** (not your regular password) — enable 2FA first
- Check Render logs for `[contact] Email transport disabled` messages

### Slow first request after idle
- On Render Starter plan, services may spin down after 15 minutes of inactivity
- Upgrade to a higher plan or add an external uptime monitor (e.g. UptimeRobot) to ping `/healthz`

---

## 7. DB Import/Seed Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Full import | `npm run db:import:full` | Imports all JSON from `migration-full/` |
| Export import | `npm run db:import:exports` | Imports from `exports/` |
| Full export | `npm run db:export:full` | Exports all collections to `migration-full/` |
| Sample export | `npm run db:export:sample` | Exports sample data to `migration-input/` |
| DB check | `npm run db:check` | Verifies MongoDB connection and lists collections |
| Seed products | `npm run seed:products` | Creates sample products |
| Seed tutorials | `npm run seed:tutorials` | Creates sample tutorials |
| Seed tutorial cats | `npm run seed:tutorial-categories` | Creates tutorial categories |

To run these against Atlas, set `MONGO_URI` and `DB_NAME` env vars before running.

---

## 8. Architecture Summary

```
┌─────────────────────────────────────┐
│         Render Web Service          │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │ server.js │───▶│  Express App  │  │
│  └──────────┘    └───────┬───────┘  │
│                          │          │
│  ┌───────────────┐  ┌────▼─────┐   │
│  │  public/      │  │  /media  │   │
│  │  (static,     │  │  (served │   │
│  │   ephemeral)  │  │   from   │   │
│  └───────────────┘  │   disk)  │   │
│                     └────┬─────┘   │
│                          │         │
│  ┌───────────────────────▼──────┐  │
│  │   Persistent Disk            │  │
│  │   /opt/render/media          │  │
│  │   ├── images/                │  │
│  │   │   ├── avatars/           │  │
│  │   │   └── *.webp             │  │
│  │   └── uploads/               │  │
│  └──────────────────────────────┘  │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────┐
│   MongoDB Atlas          │
│   (cloud database)       │
└──────────────────────────┘
```

**Key points:**
- `public/` = code-only static assets (HTML, CSS, JS) — deployed with the app, ephemeral
- `MEDIA_ROOT` (`/opt/render/media`) = user-uploaded and generated media — on persistent disk, survives redeploys
- Media is served via `/media/*`, `/images/*`, and `/uploads/*` URL paths
- Old database URLs (e.g. `/images/foo.webp`) continue to work thanks to backward-compat static routes
