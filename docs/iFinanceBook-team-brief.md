# iFinance Books — Project Brief for Team Lead

**Product name:** iFinance Books (repo: `ifinance-app`)  
**Purpose:** Desktop-style web app for a vehicle hire-purchase (HP) finance office: customer EMIs, field collections, related books (handloans, banks, chits, etc.), and double-entry accounting.  
**As of:** 15 September 2026 (workspace review of the current codebase)

This document is based on the full repository (frontend, backend, SQL, scripts, CI). There are **no `TODO` / `FIXME` / `HACK` comments** in source; gaps are inferred from disabled UI, unused settings, dual data stores, and missing product capabilities.

---

## 1. Project overview

### 1.1 What it is

iFinance Books is an operations system for a two-wheeler / vehicle finance business (sample data is Andhra Pradesh–centric: Tadepalligudem, Tanuku, Eluru). Core job:

1. Open an HP finance (customer + vehicle + EMI schedule).
2. Collect EMI receipts (with optional travelling allowance).
3. Track overdue interest, seize/close accounts, settle remaining dues (STM).
4. Keep side books: handloans, banks/UPI, deposits, cheques, chits, assets, income/expense.
5. Post collections into a chart of accounts and produce day report, line report, trial balance, P&L, and balance sheet.

It is a **modern rewrite** of a classic desktop finance package (navbar “Transactions / Others”, HP numbers, line reports, STM/RMD language).

### 1.2 Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18, Vite 5, React Router 6 (`HashRouter`) | SPA, hash URLs for GitHub Pages |
| Charts | Recharts | Open vs closed HPs, financed amount, collections |
| Backend | Node.js, Express 4, ES modules | Port **4000** |
| Auth | JWT (`jsonwebtoken`), passwords via `bcryptjs` | 7-day tokens; default secret `dev-secret` if env missing |
| Database | PostgreSQL (`pg` pool) | Schema in `backend/sql/` plus phased migrations |
| Dev proxy | Vite `/api` → `localhost:4000` | `frontend/vite.config.js` |
| Deploy (UI only) | GitHub Pages | `.github/workflows/deploy-pages.yml`; `base: /ifinancebook/` in production |
| Tests | None | No Jest/Vitest/Playwright |

**Not used:** ORM, Redis, queues, SMS/WhatsApp, email, file storage, audit log tables, automated backups.

### 1.3 High-level architecture

```
Browser (HashRouter SPA, :5173)
    │  Authorization: Bearer <JWT>
    │  localStorage key: ifinance_session
    ▼
Vite proxy  /api  →  Express (:4000)
    │
    ├── /api/auth          (public login/register)
    ├── /api/health        (public)
    ├── /api/customers     JWT
    ├── /api/tx            JWT  (Phase-2 resources; also reachable via /api/modules)
    ├── /api/accounting    JWT
    └── /api/*             JWT  (dashboard, modules, reports, settings, search)
    │
    ▼
PostgreSQL
    ├── Live books: customers, emi_schedules, receipts, journals, …
    └── Derived snapshots: dashboard_stats, ledger_lines, chart_*  (recomputed by refresh.js)
```

**Write path (example: EMI receipt):** UI `Receipt.jsx` → `api.recordEmiPayment` → `POST /customers/:id/receipts` → insert receipt, allocate to EMI rows, day-report line, bump first bank account, optional journal (`postEmiReceipt`), then `refreshAllDerived()`.

---

## 2. How the project works

### 2.1 User journey

1. **Login / register** (`/login`)  
   Demo users: `admin` / `clerk` / `line` with password `demo123`. Register is **public** and can create `ADMIN`. Session stored in `localStorage`.

2. **Dashboard** (`/dashboard`)  
   Six live tiles (income, expenses, EMI collection, handloan outstanding labelled “HP HL Collection”, OD total, closed HP count) plus folder cards into modules.

3. **Search**  
   Navbar (2+ characters, 250 ms debounce) and `/search` hit `GET /api/search`. Searches pages, customers, bikes, users, COA, journals, and module tables.

4. **New finance** (`/finance/new`)  
   Creates `customers` + generated EMI schedule + an RTA generic-module row.

5. **Finance list** (`/finance`)  
   Paginated search of HP accounts.

6. **Customer workspace** (`/finance/:id`)  
   Action bar: Receipt, Out Payment, Hand Loans, EMI Reports, Bills, OD’s, STM, RMD, Seized, Closed, Overview.

7. **Collection**  
   Receipt posts money against oldest unpaid EMIs; print slip via `ReceiptSlip.jsx`. Bills tab reprints history.

8. **Other books**  
   `/module/:key` is one CRUD screen for Phase-2 tables **or** JSON generic modules (Agents, RTA, Branches, …). Consultancy is a dedicated bike purchase/sale screen.

9. **Accounting**  
   Chart of accounts, account ledger, journals (manual + reverse), trial balance. Receipts and I&E bills auto-post when COA exists.

10. **Reports**  
    Reports menu (~50 names). Linked chips open live reports; grey chips are **not implemented**.

11. **Admin**  
    Users (create restricted to ADMIN on API), Settings (JSON blob), Support (read-only view of company fields).

### 2.2 Folder structure

```
ifinance-app/
├── package.json                 Root scripts (dev, db:setup, db:seed, phases)
├── README.md
├── .github/workflows/deploy-pages.yml
├── docs/                        This brief (architecture HTML mentioned in backend README is missing)
├── frontend/
│   ├── src/App.jsx              All routes
│   ├── src/api/api.js           Fetch client
│   ├── src/context/AuthContext.jsx
│   ├── src/components/          Layout, Navbar, tables, receipt slip, pagination
│   ├── src/pages/{auth,dashboard,finance,customer,modules,reports,accounting,admin}
│   └── vite.config.js
└── backend/
    ├── src/index.js             Express app
    ├── src/db.js
    ├── src/mappers.js           DB row → camelCase API
    ├── src/middleware/auth.js
    ├── src/config/txConfig.js   Navbar module key → Phase-2 resource
    ├── src/routes/              auth, customers, transactions, accounting, misc
    ├── src/services/            ledger, refresh, search, lineReport
    ├── src/utils/               emi, settings, pagination
    ├── sql/                     schema.sql, phase2.sql, phase3.sql, p0_polish.sql
    └── scripts/                 setupDb, seed, setupPhase2/3, setupP0
```

### 2.3 How modules interact

| Event | Side effects |
|---|---|
| Create HP | EMI schedule; RTA JSON row; refresh dashboard/charts |
| EMI receipt | Allocate schedule; `day_report_rows`; first `bank_accounts` balance += total; auto-close if fully paid; journal Dr Cash / Cr HP receivables (+ TA) |
| Out payment | `out_payments` + duplicate `handloan_accounts` row |
| Customer handloan | `customer_handloans` + `handloan_accounts` |
| Consultancy purchase | `bike_purchases` + `asset_accounts` |
| I&E bill | `ie_bills` + journal vs CASH / BANK COLLECTIONS |
| Settlement (STM) | Mark remaining EMIs paid; close customer; `settlements`; day report; journal |
| Almost every write | `refreshAllDerived()` updates `dashboard_stats`, `ledger_lines` snapshots, chart tables |

**Important:** Financial statements prefer **Phase-3 journals**. `ledger_lines` is a fallback/snapshot and can disagree with the journal (e.g. “CASH IN HAND” stored as a **liability** in snapshots).

### 2.4 Database schema (by phase)

**Phase 0 / core (`schema.sql`)**

| Table | Role |
|---|---|
| `auth_users` | Login (username, bcrypt hash, role) |
| `staff_users` | Seeded; **no API** |
| `customers` | HP account (vehicle, EMI, seized/closed). Extra columns in `p0_polish.sql` |
| `emi_schedules` | Per-instalment due / paid / balance / status |
| `out_payments` | Disbursements / “out” money |
| `receipts` | EMI collections + TA |
| `bike_purchases` | Consultancy stock |
| `generic_modules` / `generic_module_rows` | JSON lists (Agents, RTA, …) |
| `report_menu` | Catalogue labels |
| `ledger_lines` | Snapshot BS/P&L lines |
| `day_report_rows` | Historical day book (live day report now rebuilds from receipts) |
| `chart_hps`, `chart_financed`, `chart_collection` | Dashboard charts |
| `settings` | Single JSON row `id=1` |
| `dashboard_stats` | Single stats row |
| `receipt_no_seq` | Receipt numbers (starts 400000) |

**Phase 2 (`phase2.sql`)** — dedicated tables: `handloan_accounts`, `customer_handloans`, `bank_accounts`, `capital_accounts`, `deposit_accounts`, `cheques`, `chit_accounts`, `loan_accounts`, `asset_accounts`, `investment_accounts`, `credit_accounts`, `ie_accounts`, `ie_bills`. Bike `status` / `sold_date` / `notes`.

**Phase 3 (`phase3.sql`)** — `acc_masters`, `acc_sub_masters`, `acc_accounts`, `journal_entries`, `journal_lines`.

**P0 polish (`p0_polish.sql`)** — customer address/dates/`created_by`; `customer_reminders`; `settlements`; out-payment `due_date`/`notes`.

### 2.5 API endpoints

Auth is required except `/api/health` and `/api/auth/*`. Request/response bodies are JSON. List endpoints often return `{ items, total, page, limit, totalPages, hasNext, hasPrev }` or a module wrapper `{ title, columns, rows, … }`.

#### Auth & health

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| POST | `/api/auth/login` | `{ username, password }` → `{ ok, token, user }` |
| POST | `/api/auth/register` | `{ username, password, name, role }` → JWT session |

#### Customers / HP

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/customers` | Search + paginate (`q`, `page`, `limit`, `export`) |
| POST | `/api/customers` | Create finance + EMI schedule |
| GET | `/api/customers/:id` | One customer |
| PUT | `/api/customers/:id` | Update (not HP no / EMI amount/period) |
| GET | `/api/customers/:id/emi-summary` | Schedule + OD interest |
| GET | `/api/customers/:id/bills` | Receipt history |
| GET/POST | `/api/customers/:id/reminders` | List / create |
| PATCH | `/api/customers/:id/reminders/:reminderId` | Status `pending\|done\|cancelled` |
| GET | `/api/customers/:id/settlement-preview` | Outstanding + settlement interest |
| POST | `/api/customers/:id/settlement` | Close HP (STM) |
| GET/POST | `/api/customers/:id/out-payments` | Out payments |
| GET/POST | `/api/customers/:id/handloans` | Customer handloans |
| POST | `/api/customers/:id/receipts` | EMI collection |

#### Modules & transactions

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/modules/:key` | Phase-2 or generic JSON module |
| POST | `/api/modules/:key/rows` | Create row |
| PUT | `/api/modules/:key/rows/:id` | Update |
| DELETE | `/api/modules/:key/rows/:id` | Delete |
| GET/POST | `/api/tx/modules/:key` (+ `/rows`) | Duplicate Phase-2 surface |
| GET/POST/PUT | `/api/tx/handloans`, `banks`, `cheques`, … | Direct REST (see `transactions.js`) |

Phase-2 keys (`txConfig.js`): `handloans-new`, `hand-loans`, `capitals`, `deposits`, `deposits-dp-new`, `cheques`, `banks-new`, `chits-new`, `loans-new`, `credit-transactions-new`, `investments-new`, `assets-new`, `income-expenses-new`, `income-expense-transactions`.

#### Accounting

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/accounting/masters` | Master groups |
| GET | `/api/accounting/sub-masters` | Sub-masters |
| GET/POST | `/api/accounting/accounts` | Chart of accounts + balances |
| GET | `/api/accounting/accounts/:id/ledger` | Running ledger |
| GET/POST | `/api/accounting/journals` | List / manual journal |
| GET | `/api/accounting/journals/:id` | Detail |
| POST | `/api/accounting/journals/:id/reverse` | Reversing entry |
| GET | `/api/accounting/trial-balance` | TB |
| GET | `/api/accounting/balance-sheet` | BS from ledger |
| GET | `/api/accounting/pnl` | P&L from ledger |

#### Misc / reports / admin

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Refresh + stats |
| GET | `/api/search` | Global search (`q`, `limit`) |
| GET | `/api/users` | Non-system users |
| POST | `/api/users` | Create user (**ADMIN only**) |
| GET/POST/PUT | `/api/consultancy` | Bike stock |
| GET | `/api/reports/menu` | Catalogue |
| GET | `/api/reports/day-report` | `?date=` live from receipts |
| GET | `/api/reports/line` | `view`, `type`, `village`, `asOf` |
| GET | `/api/reports/closed-hp` | Closed HPs |
| GET | `/api/reports/seized-hp` | Seized HPs |
| GET | `/api/reports/od` | Overdue + OD interest |
| GET | `/api/reports/collection` | `from` / `to` receipts |
| GET | `/api/reports/balance-sheet` | Ledger BS or snapshot fallback |
| GET | `/api/reports/pnl` | Ledger P&L or snapshot |
| GET | `/api/charts` | Chart series |
| GET/PUT | `/api/settings` | Company JSON |

---

## 3. Code explanation

### 3.1 Backend — major files

| File | What it does |
|---|---|
| `backend/src/index.js` | CORS, JSON, route mount, 500 handler |
| `backend/src/db.js` | `pg` Pool from `DATABASE_URL` |
| `backend/src/middleware/auth.js` | `requireAuth`, `requireRole` |
| `backend/src/mappers.js` | Snake_case DB → camelCase API |
| `backend/src/config/txConfig.js` | Module URL keys → tables |
| `backend/src/routes/auth.js` | Login/register validation |
| `backend/src/routes/customers.js` | HP lifecycle (create, EMI, receipts, STM, reminders) |
| `backend/src/routes/transactions.js` | Generic CRUD for Phase-2 books + I&E ledger post |
| `backend/src/routes/accounting.js` | COA, journals, reverse, TB/BS/P&L |
| `backend/src/routes/misc.js` | Dashboard, users, consultancy, modules, reports, settings |
| `backend/src/services/ledger.js` | Balanced journals, EMI/I&E auto-post, TB/BS/P&L, account ledger |
| `backend/src/services/refresh.js` | Recompute dashboard, snapshot ledger, charts |
| `backend/src/services/search.js` | `APP_PAGES` + SQL across books |
| `backend/src/services/lineReport.js` | Field line: all / HP / demand / AC / SPL / zero / today |
| `backend/src/utils/emi.js` | Schedule generator |
| `backend/src/utils/settings.js` | OD formula, day-scroll protect, default dates |
| `backend/src/utils/pagination.js` | Page/limit/`export=1` up to 5000 rows |

### 3.2 Core business logic

**EMI schedule** (`emi.js`):  
`principal = emiAmount × emiPeriod × 0.85`. Interest per EMI is `principal × 1%` (the `emiPeriod` terms cancel). Each month gets the **full EMI amount** as `amount`/`balance`. This is a simplified office formula, not reducing-balance IRR.

**Receipt allocation** (`customers.js`): FIFO on unpaid `emi_schedules`. Status `partial` or `paid`. Remainder after full payoff is **not** stored as overpayment on the schedule.

**OD interest** (`settings.js`):  
`outstanding × (odRate/100) × days overdue`. Default `odInterest` is **0.1** (0.1% per day). Computed on read, not persisted.

**Day scroll protect:** if settings `dayScrollProtect=YES`, blocks future dates and backdates older than 3 days.

**Journals** (`ledger.js`): at least two lines, one-sided debit or credit, totals must match. Auto posts are **idempotent** on `(reference_type, reference_id)`. Failures on EMI/settlement/I&E are **logged and swallowed** so the operational row still commits.

**Line report:** aggregates EMI demand/overdue per customer, filters by view, optional village, Type 1 vs Type 2 sort.

### 3.3 Frontend — major files

| File | Role |
|---|---|
| `App.jsx` | Route table |
| `api/api.js` | All HTTP; 401 clears session and jumps to `#/login` |
| `AuthContext.jsx` | Session restore |
| `Layout.jsx` | Auth gate + Navbar/Footer |
| `Navbar.jsx` | Transactions/Others menus + live search |
| Pages under `finance/`, `customer/`, `modules/`, `reports/`, `accounting/`, `admin/` | Screens matching routes |
| `GenericModuleList.jsx` | One CRUD UI for all `/module/:key` |
| `ReceiptSlip.jsx` | Printable EMI receipt |
| `utils/format.js`, `exportCsv.js` | INR formatting, CSV export |

### 3.4 Third-party / external services

| Integration | Status |
|---|---|
| PostgreSQL | Required |
| GitHub Pages | Frontend static host only — **API is not deployed** with it |
| SMS / WhatsApp / email | Settings `messagesCount` is **display-only** |
| Payment gateways | None |
| RTA / insurance / tax APIs | None (RTA is a local JSON list) |
| UPI (GPay/PhonePe) | Names of bank rows only |

---

## 4. Implemented features (working)

These have UI + API + persistence (assuming `db:setup`, `db:seed`, `db:phase2`, `db:phase3`, `db:p0` have been run).

| Feature | Where |
|---|---|
| Login + self-register | `Login.jsx`, `auth.js`, `AuthContext.jsx` |
| JWT-protected SPA | `Layout.jsx`, `middleware/auth.js` |
| Dashboard tiles + folders | `Dashboard.jsx`, `GET /dashboard`, `refresh.js` |
| Global / navbar search | `Navbar.jsx`, `GlobalSearch.jsx`, `search.js` |
| Finance list, search, pagination, CSV | `FinanceList.jsx`, `GET /customers` |
| New HP + EMI generation | `NewFinance.jsx`, `POST /customers`, `emi.js` |
| Customer overview + edit seized/closed | `CustomerDetail.jsx`, `PUT /customers/:id` |
| EMI receipt + bank bump + journal | `Receipt.jsx`, `POST …/receipts`, `ledger.js` |
| Printable receipt | `ReceiptSlip.jsx`, Bills tab |
| EMI report | `EmiReports.jsx`, `GET …/emi-summary` |
| Out payments | `OutPayments.jsx` |
| Customer handloans | `CustomerSimple.jsx` (Hand Loans), `…/handloans` |
| OD per finance | `CustomerSimple.jsx` (OD's) |
| Reminders CRUD-lite | `CustomerSimple.jsx`, `customer_reminders` |
| STM settlement + close | `CustomerSimple.jsx`, `POST …/settlement` |
| Seized / closed status views | `CustomerSimple.jsx` |
| Phase-2 books CRUD | `GenericModuleList.jsx`, `transactions.js` |
| Generic JSON modules (Agents, RTA, Branches, Lines, Bike types, Blacklist, Branch points) | `GET/POST/PUT/DELETE /modules/:key` |
| Consultancy bikes | `Consultancy.jsx`, `/consultancy` |
| Users list + ADMIN create | `Users.jsx`, `GET/POST /users` |
| Settings JSON | `Settings.jsx` |
| Support read-only | `Support.jsx` |
| Day report (by date) | `DayReport.jsx` |
| Line report (views, village, print layouts) | `LineReport.jsx`, `lineReport.js` |
| Closed / seized / OD / collection reports | matching `pages/reports/*` + `misc.js` |
| Charts | `Charts.jsx`, Recharts |
| COA, create account, ledger | `ChartOfAccounts.jsx`, `AccountLedger.jsx` |
| Journals + reverse | `Journals.jsx`, `JournalDetail.jsx` |
| Trial balance, P&L, balance sheet | accounting + report pages |
| Sub-masters list | `SubMastersPage.jsx` (read) |
| Pagination / CSV on modules | `GenericModuleList.jsx` |
| GitHub Pages build | `deploy-pages.yml` |

---

## 5. Partially implemented / in progress

**No TODO/FIXME/HACK comments** were found. Incomplete behaviour:

| Item | Evidence |
|---|---|
| Reports catalogue vs live reports | `ReportsMenu.jsx` maps a subset; rest are **disabled** chips. Dashboard still says “50+ reports”. |
| Settings vs behaviour | Many keys saved but unused: `emiFrequency`, `consultancyInterest`, `handloanType`, extra receipt series (`hphl`, `hpop`, `hpOd`, `hl`), `emiReportCbClr`, `messagesCount`. Only `odInterest`, `settlementInterest`, `dayScrollProtect`, `autoDate`, `hpRcptSeries`, `hpOpDueDate`, address/bank fields are meaningfully used. |
| Dual books | HP handloans live in `customer_handloans` **and** `handloan_accounts`. Out payments also insert a handloan row. No repayment/close workflow on those copies. |
| Dual accounting | Journals (Phase 3) vs `ledger_lines` snapshots (refresh). BS/P&L try ledger first, then seed snapshot. Snapshot “CASH IN HAND” is a liability; unusual vs textbooks. |
| Day book | Receipts still insert `day_report_rows`, but `GET /reports/day-report` **rebuilds from receipts**, so settlement lines in `day_report_rows` may not appear. |
| Seized / closed customer tabs | Status display only; no dedicated seized-vehicle workflow or closed-HP ledger. |
| `staff_users` | Table + seed, unused. |
| Sub-masters / masters | GET only; no create/edit UI or API beyond listing. |
| Journal list | Hard `LIMIT 200`. |
| Role model | Roles exist (`ADMIN`, `CLERK`, `LINE EXECUTIVE`) but UI is the same for all. Only `POST /users` is ADMIN-gated. Register can pick ADMIN. |
| Ledger post optional | `console.warn('Ledger post skipped')` on receipts/settlement/I&E if COA missing — operational data and books **diverge silently**. |
| `updateResource` in `transactions.js` | Exported; used from misc. `updateNamed` exists; loans/credits POST do **not** always call `refreshAllDerived`. |
| GitHub Pages | Static UI without a hosted API (unless `VITE_API_URL` is set at build). |

### 5.1 Disabled report names (seeded, grey chips)

Examples still **pending** as dedicated reports: Demand Collection, C Book (HP/CNSLT/ALL), Bike Repairs, HL Type 2 Collection, Reminders (global), Non Closed, HP Handloan, Deposits DP, HP Insurance/Tax/Pollution/RTA token, Consultancy RTA token, HP Interest, Customer Mobiles, Delinquency Bucket. Several P&L variants all point at the **same** P&L page.

---

## 6. Not implemented / pending work

Typical for this product, missing from code:

- Delete/void receipt, edit EMI amount, regenerate schedule  
- Customer delete / merge / HP number change  
- Document upload (RC, agreement, KYC, photos)  
- SMS/WhatsApp reminders despite `messagesCount`  
- Multi-branch tenancy (Branches module is a JSON list, not data isolation)  
- Agent-wise collection assignment (Agents list is not linked to receipts)  
- Cheque clearing workflow that posts banks  
- Handloan **receipts** / interest collection (only issue + static balance)  
- GST, TDS, statutory reports  
- Audit trail / who-changed-what beyond `created_by` strings  
- Password reset, lockout, session revoke, 2FA  
- Role-based menus (line executive should not get Settings/COA)  
- Automated tests, CI for backend, Docker/compose  
- Production process manager, migrations runner (scripts are manual `db:phase2` etc.)  
- Opening balances wizard (journal `OPENING` type exists in comments only)  
- Email statements, customer portal  
- Offline / PWA  

---

## 7. Known issues / improvements

### Security

| Issue | Detail |
|---|---|
| Default JWT secret | `JWT_SECRET \|\| 'dev-secret'` |
| Open registration | Anyone can create `ADMIN` |
| Almost no RBAC | Clerks can PUT settings, post journals, delete module rows |
| SQL identifier interpolation | `updateNamed` uses `` UPDATE ${table} `` — table comes from a switch, not user input, but pattern is fragile |
| CORS credentials | Fixed origin; OK for demo |
| Token in `localStorage` | XSS would steal session |
| Demo passwords in README | Fine for demo, must change for production |
| Settings PUT | No schema validation; client overwrites entire JSON |

### Correctness

| Issue | Detail |
|---|---|
| EMI math | 85% + 1% interest heuristic; `interest_component` not used in receipt allocation |
| Overpayment | Extra receipt amount is not applied after last EMI |
| First bank only | Receipts credit `ORDER BY id LIMIT 1` bank, not a chosen account |
| Handloan duplication | Same economic event in two tables; dashboard “HL collection” is **outstanding balances**, not collections |
| Silent ledger skip | Books can miss receipts |
| Settlement journal | Waiver/write-off lines can be awkward if `amountCollected` vs `outstanding` edges |
| `totalLoan: 0` in EMI summary | Field hardcoded zero in API (`customers.js`) |

### Performance & ops

- `refreshAllDerived` on many writes (full chart rebuilds).  
- Global search fans out many queries.  
- No indexes on `customers` search columns besides PK/unique HP.  
- No connection-pool tuning / SSL notes.  
- Unhandled async errors in some route handlers rely on Express 4 not catching them unless wrapped.

### UX / product

- HashRouter URLs (`#/dashboard`).  
- Register on the login screen is unusual for an office system.  
- Grey report chips look like a finished catalogue.  
- No print CSS beyond receipt/line report classes.

---

## 8. How to run (for the demo)

```bash
npm run install:all
# backend/.env from .env.example → DATABASE_URL, JWT_SECRET
npm run db:setup && npm run db:seed
npm run db:phase2 && npm run db:phase3 && npm run db:p0
npm run dev:backend    # :4000
npm run dev:frontend   # :5173
```

Login: `admin` / `demo123`.

---

