# iFinance Books

Vehicle finance & accounting — React frontend + Express/PostgreSQL backend.

## Folder structure

```
ifinance-app/
│
├── frontend/                 # UI (React + Vite)  → http://localhost:5173
│   ├── src/
│   │   ├── api/              # API calls to backend
│   │   ├── components/       # Shared UI (Navbar, tables, …)
│   │   ├── context/          # Auth session
│   │   ├── pages/
│   │   │   ├── auth/         # Login / register
│   │   │   ├── dashboard/    # Home + global search
│   │   │   ├── finance/      # Finance list + new finance
│   │   │   ├── customer/     # One finance detail tabs
│   │   │   ├── modules/      # Handloans, banks, consultancy, …
│   │   │   ├── reports/      # Day report, BS, P&L, charts
│   │   │   ├── accounting/   # COA, journals, trial balance
│   │   │   └── admin/        # Users, settings, support
│   │   ├── utils/
│   │   ├── App.jsx           # Routes
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── backend/                  # API (Express)  → http://localhost:4000
│   ├── src/
│   │   ├── config/           # Module maps
│   │   ├── middleware/       # JWT auth
│   │   ├── routes/           # HTTP endpoints
│   │   ├── services/         # Ledger, search, refresh
│   │   ├── utils/
│   │   ├── db.js
│   │   ├── mappers.js
│   │   └── index.js
│   ├── sql/                  # Schema + migrations
│   └── scripts/              # db setup / seed
│
├── docs/
├── package.json              # Root helpers (run both apps)
└── README.md
```

## How they connect

```
Browser  →  frontend (5173)  →  /api proxy  →  backend (4000)  →  PostgreSQL
```

## Run

```bash
npm run install:all
npm run dev:backend     # terminal 1
npm run dev:frontend    # terminal 2
```

Open http://localhost:5173 — login `admin` / `demo123`

## Backend env

```bash
cd backend
copy .env.example .env
# set DATABASE_URL, then:
npm run db:setup
npm run db:seed
```
