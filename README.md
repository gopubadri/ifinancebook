# iFinance Books — Frontend (React)

A front-end-only React rebuild of the iFinance Books system described in the two
project documents (technical analysis + UI architecture). It's a **demo/prototype**:
there is no real server, no real database, and no real authentication — everything
is simulated so you can click through the whole app end-to-end. It's built so that
plugging in a real backend later means editing **one file** (`src/data/api.js`)
and nothing else.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). You'll land on the
login screen.

- **Fastest path in:** click **"Continue with demo login →"**.
- **Or use credentials:** `admin` / `demo123` (also `clerk` / `demo123` and
  `line` / `demo123` — these just set a different display name/role, the app
  doesn't restrict anything by role in this demo).

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

## What "clicking a tab gets you data" actually means here

There's no backend, so `src/data/api.js` plays that role. Every function in it
(`getCustomers()`, `getEmiSummary(id)`, `getBalanceSheet()`, ...) returns a
**Promise that resolves after ~300-450ms**, exactly the shape a real
`fetch('/api/...')` call has. Every page:

1. Renders a `<Loader />` while the promise is pending.
2. Calls the matching `api.js` function inside a `useEffect`.
3. Re-renders with real data once it resolves.

So when you click a dashboard card, a navbar dropdown item, or a customer's
action-bar tab (Receipt / Out Payment / Emi Reports / ...), you are watching a
genuine "navigate → fetch → loading → render" cycle, just against mock data
instead of a live server. When you're ready to connect a real backend, replace
the bodies of the functions in `api.js` with real `fetch`/`axios` calls that
return the same shapes — no page component needs to change.

## Project structure

```
src/
  main.jsx                 # React root, wraps app in BrowserRouter + AuthProvider
  App.jsx                  # All routes live here (see "Routing" below)
  index.css                # Every style in the app — design tokens + component classes

  context/
    AuthContext.jsx         # Demo auth: login/logout, session persisted in localStorage

  data/
    mockData.js             # The "database" — plain JS objects/arrays modeled on
                             # the tables described in the technical analysis doc
                             # (customers, emi_schedules, sub_masters, settings, etc.)
    api.js                  # The "API" — wraps mockData in delayed Promises.
                             # THIS is the file you replace to go live.

  components/
    Navbar.jsx               # Top nav: Transactions ▾ / Others ▾ dropdowns, search, user menu
    ActionBar.jsx            # The pill-button row on customer pages (Receipt/Out Payment/...)
    Breadcrumb.jsx            # "Dashboard / Finance's / Name" trail
    DataTable.jsx             # Generic table: pass `columns` + `rows`, it renders the rest
    Loader.jsx                # Small "fetching..." indicator shown while api.js resolves
    Footer.jsx                # Site footer with the notice banner
    Layout.jsx                # <ProtectedLayout>: redirects to /login if not signed in,
                               # otherwise renders Navbar + page content + Footer

  utils/
    format.js                # inr() money formatter, titleCase() helper

  pages/
    Login.jsx                 # Login screen (demo login + credential form)
    Dashboard.jsx              # Stat bar + module grid (mirrors UI doc section 2)
    FinanceList.jsx            # Customer list ("Finance's"), supports ?q= search from navbar
    GenericModuleList.jsx      # ONE component that renders Handloans, Bank, Chits, Loans,
                                # Deposits, Cheques, Assets, RTA, Masters, Agents, etc. —
                                # driven entirely by the `genericModules` config in mockData.js
    Consultancy.jsx            # Bike purchases list (its own column set)
    Users.jsx, Settings.jsx, ReportsMenu.jsx, BalanceSheet.jsx, PnL.jsx,
    DayReport.jsx, Charts.jsx, Support.jsx

    pages/customer/            # Everything scoped to one customer/finance record
      CustomerFrame.jsx          # Fetches the customer by :id, renders the ActionBar +
                                  # breadcrumb once, then renders whichever sub-page is
                                  # active via <Outlet context={{ customer }} />
      CustomerDetail.jsx          # Overview: collapsible Vehicle/Finance/Comms/Attachments panels
      EmiReports.jsx               # Summary cards + full EMI schedule table
      OutPayments.jsx              # Out-payment history table
      Receipt.jsx                  # EMI payment entry form (simulated "save")
      CustomerSimple.jsx           # Reusable empty-state page for Hand Loans/Bills/
                                    # Clearance/Reminders/Seized/Closed (kept simple since
                                    # the source docs don't specify these screens in depth)
```

## Routing map

All routes below (except `/login`) are wrapped by `ProtectedLayout`, which
redirects to `/login` if `AuthContext` has no user.

| Route | Page | Notes |
|---|---|---|
| `/login` | `Login` | Public |
| `/dashboard` | `Dashboard` | Stat bar + module grid, matches UI doc §2 |
| `/finance` | `FinanceList` | Customer table; `?q=` filters by name/HP/mobile/village |
| `/finance/:id` | `CustomerDetail` (via `CustomerFrame`) | Vehicle/finance detail |
| `/finance/:id/receipt` | `Receipt` | Record an EMI payment |
| `/finance/:id/emi-reports` | `EmiReports` | Full EMI schedule |
| `/finance/:id/out-payments` | `OutPayments` | Out-payment history |
| `/finance/:id/handloans`, `/bills`, `/ods`, `/clearance`, `/reminders`, `/seized`, `/closed` | `CustomerSimple` | Empty-state placeholders |
| `/module/:key` | `GenericModuleList` | `:key` matches a key in `genericModules` (e.g. `handloans-new`, `banks-new`, `cheques`, `rta`, `masters`...) |
| `/consultancy` | `Consultancy` | Bike purchases |
| `/users` | `Users` | Staff list |
| `/reports` | `ReportsMenu` | The 50+ report catalogue from the technical spec (as chips) |
| `/reports/balance-sheet` | `BalanceSheet` | Liabilities vs. assets |
| `/reports/pnl` | `PnL` | Income vs. expenses |
| `/reports/day-report` | `DayReport` | Daily collection report |
| `/charts` | `Charts` | HP's (pie), Financed Amount (bar), Collection (line) — recharts |
| `/settings` | `Settings` | Interest rates, receipt series, company/bank info |
| `/support` | `Support` | Contact/payment details card |

## How the pieces connect (the short version)

1. **`main.jsx`** boots React, wraps everything in `<BrowserRouter>` so routing
   works, and `<AuthProvider>` so any component can call `useAuth()`.
2. **`AuthContext.jsx`** is the only thing that knows whether someone is
   "logged in." `Login.jsx` calls `login()`/`loginDemo()`; `Layout.jsx` calls
   `useAuth()` to decide whether to show the app or bounce to `/login`.
3. **`App.jsx`** is the map of every URL to every page. Nested routes under
   `/finance/:id` all render inside `CustomerFrame`, which is why every
   customer sub-page (Receipt, EMI Reports, Out Payments, ...) shares the same
   action bar and breadcrumb without repeating that code.
4. **Pages fetch their own data.** Nobody passes data down from `App.jsx` —
   each page calls the relevant `api.js` function in a `useEffect` and manages
   its own loading state. This mirrors how a real app talks to a real backend,
   and means you can develop/test any single page in isolation.
5. **`mockData.js` mirrors the schema** in the technical analysis document
   (`customers`, `emi_schedules`, `sub_masters`, `settings`, etc.) so the shape
   of the data you see in the UI matches the shape a real MySQL/Postgres
   schema for this app would produce.
6. **`GenericModuleList.jsx` avoids 15 duplicate files.** The technical doc
   describes ~15 "Transactions"/"Others" modules (Handloans, Bank, Chits,
   Loans, Deposits, Cheques, Assets, RTA, Masters, Agents, ...) that all share
   the exact same list-page layout with different columns. Instead of one
   component per module, there's a single `genericModules` config object in
   `mockData.js` keyed by the same URL slug the original PHP app used
   (`handloans-new`, `banks-new`, `cheques`, ...), and one `GenericModuleList`
   component that reads `:key` from the URL and renders whatever that config
   says. Adding a new module later is a config entry, not a new file.

## Design notes

The look is a deliberate "ledger / passbook" theme rather than the original
Bootstrap-blue admin-panel look: a deep ledger-green navbar, a warm cream
paper background, brass/amber accents, `IBM Plex Mono` for every number/ID
(receipt numbers, balances, HP numbers) so figures read like they came out of
a passbook, and a dashed "stamp" badge style for statuses (paid/pending/
seized/closed) — echoing the rubber-stamp feel of a physical receipt book.
All of this lives in `src/index.css`; there's no CSS framework dependency.

## What's intentionally simplified

This is a UI/UX + data-flow prototype, not a production system. Things you'd
need to add for a real deployment:

- A real backend + database (swap `data/api.js` for real HTTP calls).
- Real authentication (JWT/sessions) instead of a localStorage flag.
- Persisted writes — "Submit" on the Receipt/Settings forms currently
  resolves successfully but doesn't change anything in `mockData.js`.
- Role-based access control (Admin/Clerk/Line Executive currently just change
  the name shown in the navbar).
- The remaining report chips in `/reports` (only Day Report, Balance Sheet,
  and P&L are wired to real pages; the other ~55 are shown for completeness
  per the technical spec but aren't built out).
- Pagination on the customer list (all 6 demo customers render on one page;
  the real system has 1,376).

## Tech stack

- **React 18** + **React Router v6** for routing/navigation
- **Vite** for dev server & bundling
- **Recharts** for the Charts page
- Plain CSS (no Tailwind/Bootstrap) — see "Design notes" above
