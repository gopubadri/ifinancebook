# iFinance Books — System notes for a new developer

**Product:** iFinance Books (repo folder: `ifinance-app`)  
**What it is:** A web app for a vehicle hire-purchase (HP) finance office. Staff open HP accounts, collect EMIs, keep side books (handloans, banks, chits, …), and post money into double-entry accounting (day report, line report, trial balance, P&L, balance sheet).

Read this document **top to bottom**. It follows the order the system was built: tools → database → API → UI → how a request travels → what each feature does.

---

## 0. Picture of the whole system

Three programs must run together. None of them is the full product by itself.

```
You (browser)
    → React UI          Vite, port 5173
    → Express API        Node, port 4000
    → PostgreSQL         data store
```

| Layer | Technology | Default URL | Language of the code |
|--------|------------|-------------|----------------------|
| UI | React 18 + Vite 5 + React Router 6 | `http://127.0.0.1:5173` | JavaScript (JSX) |
| API | Node.js + Express 4 | `http://127.0.0.1:4000` | JavaScript (ES modules) |
| Database | PostgreSQL | `localhost:5432` database `ifinance` | SQL + Node setup scripts |
| Auth | JWT + bcrypt | Token in `Authorization` header | JavaScript |
| Charts | Recharts | Dashboard / Charts page | JSX |

**How they connect in development**

```
Browser calls fetch('/api/dashboard')
    → Vite sees path starting with /api
    → Vite proxies to http://127.0.0.1:4000/api/dashboard
    → Express route (JWT required except login/register/health)
    → pg Pool runs SQL
    → JSON back to the React page
```

If the API is not running you get Vite `ECONNREFUSED` on `/api/...`. If two APIs try to start you get `EADDRINUSE` on port 4000. Root `npm run dev` starts **only the frontend**. Use `npm run dev:backend` and `npm run dev:frontend` in two terminals.

---

## 1. What you install first (order)

These are **not** committed as installers. A new machine needs them before `npm install`.

1. **Node.js** (project was run on Node 20) — gives `node` and `npm`.
2. **PostgreSQL** — server listening locally; you need a user/password.
3. Clone / open `ifinance-app`.
4. **Install npm packages** (React, Express, `pg`, etc.):

```bash
npm run install:all
```

That runs `npm install` in `frontend/` and `backend/` separately. There is no single mixed Node app.

5. **Create `backend/.env`** from `backend/.env.example`:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port, default `4000` |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@localhost:5432/ifinance` |
| `JWT_SECRET` | Signs login tokens (change in production) |
| `CORS_ORIGIN` | Allowed UI origin, default `http://localhost:5173` |

6. **Create schema and demo data** (order matters):

```bash
npm run db:setup      # create database + core tables
npm run db:seed       # demo users and HP accounts (wipes core tables)
npm run db:phase2     # handloans, banks, chits, …
npm run db:phase3     # chart of accounts + journals
npm run db:p0         # reminders, settlements, audit, extra customer columns
```

7. **Run both apps:**

```bash
npm run dev:backend     # terminal 1
npm run dev:frontend    # terminal 2
```

Open `http://127.0.0.1:5173` — demo login `admin` / `demo123` (also `clerk` and `line` with the same password).

Optional UI env: `VITE_API_URL` if the API is not reached via the Vite `/api` proxy (production). Production UI `base` is `/ifinancebook/` for GitHub Pages.

---

## 2. Repo layout (what lives where)

```
ifinance-app/
├── package.json              # root scripts only (orchestrates frontend + backend)
├── README.md
├── .github/workflows/        # GitHub Pages deploy of the UI
├── docs/                     # this file and team briefs
├── frontend/                 # React SPA
│   ├── index.html            # HTML shell, mounts #root
│   ├── vite.config.js        # port 5173, /api proxy, production base path
│   ├── package.json          # react, react-router-dom, recharts, vite
│   └── src/
│       ├── main.jsx          # HashRouter + AuthProvider
│       ├── App.jsx           # all routes
│       ├── index.css         # global styles
│       ├── api/api.js        # every HTTP call to the backend
│       ├── context/          # login session
│       ├── components/       # shared UI
│       ├── pages/            # screens
│       └── utils/            # money/date format, CSV export
└── backend/
    ├── .env.example
    ├── package.json          # express, pg, cors, dotenv, bcryptjs, jsonwebtoken
    ├── sql/                  # CREATE TABLE scripts
    ├── scripts/              # apply SQL + seed
    └── src/
        ├── index.js          # Express app, mount routes, listen
        ├── db.js             # PostgreSQL pool
        ├── mappers.js        # snake_case rows → camelCase JSON
        ├── middleware/auth.js
        ├── config/txConfig.js
        ├── routes/
        ├── services/
        └── utils/
```

**File language cheat-sheet**

| Extension / file | Written in | Role |
|------------------|------------|------|
| `.jsx` | JavaScript + JSX | React screens and components |
| `.js` in `frontend/src` (non-JSX) | JavaScript | API client, formatters, auth context |
| `.js` in `backend/src` | JavaScript (ESM `import`/`export`) | Express routes, services |
| `.sql` | PostgreSQL SQL | Tables, indexes, seeds inside SQL files |
| `backend/scripts/*.js` | JavaScript | Run SQL files and insert demo rows |
| `.json` | JSON | npm package manifests |
| `.css` | CSS | One global stylesheet (`index.css`) |
| `.yml` | YAML | GitHub Actions |
| `.html` | HTML | Vite entry page |
| `.env` | Key=value | Secrets; **not** committed |

There is **no TypeScript**, **no ORM** (raw SQL via `pg`), **no Redis**, **no test suite**.

---

## 3. Database — what was built, in order

The database was not one giant dump. It grew in **phases**. Always apply them in this order.

### Phase 1 — Core HP office (`backend/sql/schema.sql`)

Applied by `backend/scripts/setupDb.js`.

| Table | What it holds |
|-------|----------------|
| `auth_users` | Login accounts (username, bcrypt hash, role) |
| `staff_users` | Staff directory rows for the Users screen |
| `customers` | One HP finance (hp_no, vehicle, EMI terms, seize/close flags) |
| `emi_schedules` | Each instalment due date / amount / paid status |
| `out_payments` | Extra money paid out on an HP |
| `receipts` | EMI collection receipts |
| `bike_purchases` | Consultancy / vehicle purchase-sale book |
| `generic_modules` / `generic_module_rows` | Flexible folders (RTA, agents, …) as JSON rows |
| `report_menu` | Labels for the Reports menu |
| `ledger_lines` | Snapshot lines for older BS/P&L if live journals missing |
| `day_report_rows` | Day book lines |
| `chart_hps`, `chart_financed`, `chart_collection` | Chart snapshots |
| `settings` | One JSON blob (rates, receipt series, company info) |
| `dashboard_stats` | One row of dashboard tiles |

Sequence `receipt_no_seq` starts at 400000 for receipt numbers.

### Phase 2 — Side books (`backend/sql/phase2.sql`)

Applied by `backend/scripts/setupPhase2.js`.

Handloan accounts, customer-linked handloans, banks, capitals, deposits, cheques, chits, loans, assets, investments, credits, income/expense accounts and bills. Extra columns on bike purchases (`status`, `sold_date`, `notes`).

### Phase 3 — Double-entry (`backend/sql/phase3.sql`)

Applied by `backend/scripts/setupPhase3.js`.

| Table | What it holds |
|-------|----------------|
| `acc_masters` | Top-level account groups |
| `acc_sub_masters` | Sub-groups |
| `acc_accounts` | Leaf accounts |
| `journal_entries` | Journal header (date, narration, type) |
| `journal_lines` | Debit/credit lines (must balance) |

Script also seeds a chart of accounts and an opening journal.

### P0 polish (`backend/sql/p0_polish.sql`)

Applied by `backend/scripts/setupP0.js`. Extra customer fields (address, seize/close dates, compliance dates), `customer_reminders`, `settlements`, `receipt_allocations`, `handloan_receipts`, `audit_events`, receipt void / bank / overpayment, cheque clearing, `day_report_rows.entry_date`.

On every API start, `backend/src/utils/office.js` → `ensureOfficeSchema()` tries to add missing office columns so an old DB still boots.

**Demo seed** (`backend/scripts/seed.js`) is **destructive** on core tables. Demo users: `admin`, `clerk`, `line` / `demo123`. Sample HPs around Andhra Pradesh villages.

---

## 4. Backend — what was implemented inside Node/Express

### 4.1 App startup (`backend/src/index.js`) — JavaScript

Order of middleware (this order is load-bearing):

1. Load `.env`
2. CORS (browser on 5173 may call API)
3. `express.json()` (parse JSON bodies)
4. `GET /api/health` — **public**, `{ ok: true }`
5. `/api/auth` — login/register public; change-password uses JWT inside the router
6. `/api/customers` — JWT
7. `/api/tx` — JWT (direct REST for Phase-2 tables)
8. `/api/accounting` — JWT + ADMIN/CLERK on the router
9. `/api` everything else — JWT (dashboard, modules, reports, users, settings)
10. Error handler → `{ error }` status 500
11. `ensureOfficeSchema()` then `listen(PORT)`

### 4.2 Database access (`backend/src/db.js`) — JavaScript

Creates a `pg` `Pool` from `DATABASE_URL`. All routes use `query(sql, params)` with `$1` placeholders (never string-concatenated SQL).

### 4.3 Auth (`backend/src/middleware/auth.js` + `routes/auth.js`) — JavaScript

- Passwords: **bcryptjs**
- Token: **jsonwebtoken**, payload `{ id, username, name, role }`, 7 days
- `requireAuth` — missing/invalid token → 401
- `requireRole('ADMIN')` etc. → 403
- Self-register may only create **CLERK** or **LINE EXECUTIVE**. Admins are created from Users. Usernames `admin`, `clerk`, `line` are reserved.

### 4.4 Route files (all JavaScript)

| File | Mount | Job |
|------|--------|-----|
| `routes/auth.js` | `/api/auth` | Login, register, change password |
| `routes/customers.js` | `/api/customers` | HP CRUD, EMI, receipts, reminders, STM, out-payments, per-HP handloans |
| `routes/transactions.js` | `/api/tx` | CRUD for Phase-2 resources (banks, chits, …) |
| `routes/accounting.js` | `/api/accounting` | COA, journals, trial balance, opening balances |
| `routes/misc.js` | `/api` | Dashboard, search, `/modules/:key`, reports, users, settings, audit, consultancy, charts |

The UI talks to **`/api/modules/...`** (misc), not usually `/api/tx/...`. Both hit the same Phase-2 tables through `MODULE_MAP` in `config/txConfig.js`.

### 4.5 Services (business logic) — JavaScript

| File | Job |
|------|-----|
| `services/ledger.js` | Post journals; auto-post EMI receipts, IE bills; trial balance, BS, P&L, account ledger |
| `services/refresh.js` | Recompute `dashboard_stats`, chart tables, snapshot ledger lines after writes |
| `services/search.js` | Global search across pages, customers, modules, COA, journals, users |
| `services/lineReport.js` | Line report views (all / HP / demand / …) |
| `services/specialReports.js` | Named special reports (demand-collection, insurance, delinquency, …) |

### 4.6 Utils — JavaScript

| File | Job |
|------|-----|
| `utils/emi.js` | Build EMI schedule from finance terms + settings frequency |
| `utils/settings.js` | Read settings JSON; OD interest; backdate rules |
| `utils/pagination.js` | Page/limit query params |
| `utils/office.js` | Schema ensure, `writeAudit`, cheque updates |
| `utils/dayReport.js` | Day-report date handling |

### 4.7 Mappers (`mappers.js`) — JavaScript

Database columns are `snake_case`. The UI expects `camelCase`. Mappers such as `mapCustomer` sit between SQL and JSON.

---

## 5. Frontend — what was implemented inside React

### 5.1 Boot (`frontend/src/main.jsx`) — JSX

```
HashRouter → AuthProvider → App
```

**HashRouter** means URLs look like `http://127.0.0.1:5173/#/dashboard`. That works on GitHub Pages without server rewrite rules.

### 5.2 Session (`frontend/src/context/AuthContext.jsx`) — JSX/JS

Saves `{ token, user }` in `localStorage` key `ifinance_session`. Exposes `login`, `register`, `logout`, `useAuth()`.

### 5.3 HTTP client (`frontend/src/api/api.js`) — JavaScript

- Base: `VITE_API_URL` or `'/api'`
- Adds `Authorization: Bearer <token>`
- 401 → clear session, send user to `#/login`
- Network / 502–504 → message to start `npm run dev:backend`

All screens should call functions in this file rather than raw `fetch`.

### 5.4 Shell UI — JSX

| File | Job |
|------|-----|
| `components/Layout.jsx` | If not logged in → `/login`; else Navbar + page + Footer |
| `components/Navbar.jsx` | Brand, Transactions / Others menus, live search, user menu |
| `components/Footer.jsx` | Footer |
| `components/Breadcrumb.jsx` | Path crumbs |
| `components/ActionBar.jsx` | Tabs on a finance (receipt, EMI, bills, …) |
| `components/DataTable.jsx` | Shared table |
| `components/Pagination.jsx` | Pager |
| `components/Loader.jsx` | Loading text |
| `components/PasswordInput.jsx` | Show/hide password |
| `components/ReceiptSlip.jsx` | Printable receipt |

Utils: `utils/format.js` (`inr`, `dmy`, `titleCase`), `utils/exportCsv.js`. Styling: `index.css` only (no Tailwind/CSS-in-JS).

### 5.5 Screens by folder — all JSX

**Auth**

- `pages/auth/Login.jsx` — login + register

**Home**

- `pages/dashboard/Dashboard.jsx` — tiles + module folders
- `pages/dashboard/GlobalSearch.jsx` — full search page

**HP finance**

- `pages/finance/FinanceList.jsx` — list of customers/HPs
- `pages/finance/NewFinance.jsx` — create HP + EMI schedule
- `pages/customer/CustomerFrame.jsx` — layout for one HP
- `pages/customer/CustomerDetail.jsx` — edit HP / vehicle / status
- `pages/customer/Receipt.jsx` — collect EMI
- `pages/customer/EmiReports.jsx` — schedule + OD
- `pages/customer/OutPayments.jsx` — out payments
- `pages/customer/CustomerSimple.jsx` — reused for handloans, bills, ODs, clearance, reminders, seized, closed

**Side books**

- `pages/modules/GenericModuleList.jsx` — `/module/:key` (banks, chits, agents, …)
- `pages/modules/Consultancy.jsx` — bike purchase/sale

**Reports**

- `pages/reports/ReportsMenu.jsx`, `DayReport.jsx`, `LineReport.jsx`, `CollectionReport.jsx`, `ClosedHpReport.jsx`, `SeizedHpReport.jsx`, `OdReport.jsx`, `SpecialReport.jsx`, `BalanceSheet.jsx`, `PnL.jsx`, `Charts.jsx`

**Accounting (ADMIN / CLERK)**

- `pages/accounting/ChartOfAccounts.jsx`, `AccountLedger.jsx`, `Journals.jsx`, `JournalDetail.jsx`, `SubMastersPage.jsx`, `TrialBalance.jsx`

**Admin**

- `pages/admin/Users.jsx` (ADMIN), `Settings.jsx` (ADMIN), `AuditLog.jsx` (ADMIN), `Account.jsx` (own password), `Support.jsx`

Routes and role gates live in `App.jsx`.

---

## 6. How a typical request is wired (end to end)

Example: **collect an EMI**

1. User opens `#/finance/123/receipt` → `Receipt.jsx`
2. Form submit → `api.recordEmiPayment` in `api.js`
3. `POST /api/customers/123/receipts` with Bearer token
4. Vite proxy → Express `customers.js`
5. Backend: next receipt number, insert `receipts`, allocate to `emi_schedules` (FIFO), `receipt_allocations`, day-report line, bump bank, `postEmiReceipt` journal, `writeAudit`, `refreshAllDerived`
6. JSON returns; `ReceiptSlip.jsx` can print

Example: **open dashboard**

1. `Dashboard.jsx` → `api.getDashboardStats` → `GET /api/dashboard`
2. `misc.js` reads `dashboard_stats` (kept in sync by `refresh.js`)

---

## 7. Features in business order (what the office actually does)

1. **Log in** with a role: ADMIN (full), CLERK (accounting + operations), LINE EXECUTIVE (field/collections, no COA/journals/users).
2. **Dashboard** — income, expenses, EMI collection, handloan outstanding, OD, closed HP count; folders into every module.
3. **New finance** — customer + vehicle + terms → EMI rows + an RTA generic row.
4. **Receipt** — collect instalment, optional travelling allowance, bank, printable slip, ledger + day book.
5. **EMI reports / OD** — unpaid schedule and overdue interest from settings.
6. **Out payments, bills, handloans on the HP** — extra books tied to the same customer.
7. **Reminders** — follow-ups on an HP.
8. **Settlement (STM / clearance)** — preview remaining dues, close with journals.
9. **Seize / close** — flags and dates on the customer; dedicated reports.
10. **Transactions menu** — Phase-2 books (handloans, banks, capitals, deposits, cheques, chits, loans, credits, investments, assets, income & expense).
11. **Others / generic modules** — JSON folders (agents, branches, RTA, …) via `generic_module_rows`.
12. **Consultancy** — buy/sell bikes; carrying interest from settings.
13. **Reports** — day report, line report, collection, closed/seized HP, OD, special reports, charts.
14. **Accounting** — masters → sub-masters → accounts; journals (including reverse and opening); trial balance; P&L; balance sheet.
15. **Admin** — users and password reset, settings JSON (EMI frequency, OD%, receipt series, company, backdate rules), audit log, support/contact from settings.

After many writes the API calls `refreshAllDerived()` so dashboard tiles and charts match the books.

---

## 8. Screen → API map (quick lookup)

| UI | API |
|----|-----|
| Login / register | `POST /api/auth/login`, `/register` |
| Change own password | `POST /api/auth/password` |
| Dashboard | `GET /api/dashboard` |
| Search | `GET /api/search` |
| Finance list / new / edit | `GET/POST /api/customers`, `GET/PUT /api/customers/:id` |
| Rebuild EMI | `POST /api/customers/:id/rebuild-schedule` |
| EMI summary | `GET /api/customers/:id/emi-summary` |
| Receipt / void | `POST .../receipts`, `POST .../receipts/:no/void` |
| Reminders | `GET/POST .../reminders`, `PATCH .../reminders/:id` |
| Settlement | `GET .../settlement-preview`, `POST .../settlement` |
| Out payments | `GET/POST .../out-payments` |
| HP handloans | `GET/POST .../handloans`, `POST .../handloans/:id/repay` |
| Module screens | `GET/POST /api/modules/:key`, row PUT/DELETE |
| Consultancy | `GET/POST /api/consultancy`, `PUT /api/consultancy/:id` |
| Reports | `GET /api/reports/...`, `GET /api/charts` |
| Accounting | `/api/accounting/accounts`, `/journals`, `/trial-balance`, `/opening`, … |
| Users / settings / audit | `/api/users`, `/api/settings`, `/api/audit` |

---

## 9. Roles (UI and API)

| Role | Typical access |
|------|----------------|
| ADMIN | Everything: users, settings, audit, accounting, operations |
| CLERK | Operations + accounting; not user admin / settings write / audit |
| LINE EXECUTIVE | Operations and reports; accounting routes return 403 |

Frontend extra gate: `RoleRoute` in `App.jsx` (e.g. `/users` ADMIN only, accounting ADMIN+CLERK).

---

## 10. Config files a new person should open first

1. `README.md` — run commands  
2. `backend/.env.example` — database URL  
3. `frontend/vite.config.js` — proxy  
4. `frontend/src/App.jsx` — map of screens  
5. `frontend/src/api/api.js` — map of HTTP  
6. `backend/src/index.js` — map of API mounts  
7. `backend/src/config/txConfig.js` — `/module/:key` → table  
8. `backend/sql/schema.sql` then `phase2.sql`, `phase3.sql`, `p0_polish.sql`

---

## 11. What is *not* in this project

No mobile app, no SMS/WhatsApp, no email, no file/image storage, no ORM, no automated tests, no Redis/queue. GitHub Pages deploys the **UI only**; the API and PostgreSQL must be hosted separately for a real office.

---

## 12. Safe local run checklist

1. PostgreSQL is running and `DATABASE_URL` is correct.  
2. All five `db:*` scripts have been applied at least once.  
3. Backend terminal shows `API on http://localhost:4000`.  
4. `curl http://127.0.0.1:4000/api/health` → `{"ok":true}`.  
5. Frontend on 5173; login `admin` / `demo123`.  
6. Keep **one** backend process; do not start a second `npm run dev` in `backend/`.
