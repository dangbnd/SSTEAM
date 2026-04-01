# SmartSteam Web

Monorepo for SmartSteam website (Node.js + Express + static frontend).

## 1) Requirements

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017/`)

## 2) Quick Start

```bash
npm install
npm run db:import:full
npm run dev
```

Open:

- `http://localhost:8080/`
- `http://localhost:8080/admin`

## 3) Project Structure

```text
StemSteamWeb/
  public/                 # Static frontend pages/assets
    layout/               # Shared header/footer partials
    css/
    js/
  src/
    layout/               # HTML shared layout injector
    middleware/
    routes/               # Route modules by domain
  scripts/
    db/                   # Import/export Mongo data
    test/                 # API and DB smoke tests
    seed/                 # Seed scripts
    legacy/               # Old scripts kept for reference
  migration-full/         # Full JSON dataset for import
  migration-input/        # Sample JSON dataset
  exports/                # Exported JSON snapshots
  server.js
```

## 4) Data Commands

- `npm run db:import`  
  Auto-picks first existing data folder in this order:
  `migration-full` -> `exports` -> `migration-input`

- `npm run db:import:full`  
  Force import from `migration-full/`

- `npm run db:import:exports`  
  Force import from `exports/`

- `npm run db:export:full`  
  Export current DB to `migration-full/`

- `npm run db:export:sample`  
  Export sample docs to `migration-input/`

- `npm run db:check`  
  Print collection counts

## 5) Shared Header / Footer

- Header and footer are centralized in:
  - `public/layout/header.html`
  - `public/layout/footer.html`
- Individual HTML pages in `public/*.html` keep only body content.
- Server injects shared layout at runtime through:
  - `src/layout/sharedLayout.js`

## 6) Useful Dev Commands

```bash
npm run dev
npm start
npm run test:api:tutorials
```

## 7) Environment

Use `.env`:

```env
MONGO_URI=mongodb://localhost:27017/
DB_NAME=stem_steam_education
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

Notes:
- If `JWT_SECRET` is missing, server will generate a temporary secret per process.
- If `ADMIN_USERNAME`/`ADMIN_PASSWORD` are missing, `/api/admin/login` returns `503`.
- If Google OAuth vars are missing, `/api/auth/google/*` returns `503`.
