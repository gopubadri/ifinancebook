# iFinance Books

Vehicle finance & accounting app — **React** frontend + **Node/Express + PostgreSQL** backend.

## Folder layout

```
ifinance-app/
├── frontend/          React + Vite UI (port 5173)
├── backend/           Express API (port 4000) + SQL/scripts
├── docs/              Notes & printable architecture one-pager
└── package.json       Root helper scripts
```

## Quick start

```bash
# install (once)
npm run install:all

# terminal 1 — API
npm run dev:backend

# terminal 2 — UI
npm run dev:frontend
```

Open http://localhost:5173

Login: `admin` / `demo123` (or a registered user).

### Backend env

```bash
cd backend
copy .env.example .env
# set DATABASE_URL password, then:
npm run db:setup
npm run db:seed
```

## Root scripts

| Command | What it does |
|---------|----------------|
| `npm run dev:frontend` | Vite UI on :5173 |
| `npm run dev:backend` | API on :4000 |
| `npm run build` | Production frontend build |
| `npm run db:setup` / `db:seed` | Database init |
| `npm run db:phase2` / `db:phase3` / `db:p0` | Schema phases |

## How code connects

Browser → `frontend/` → `/api` proxy → `backend/` → PostgreSQL
