# iFinance Books API (backend)

Node.js + Express + PostgreSQL backend for the iFinance React frontend.

## Setup

1. Copy `.env.example` to `.env` and set your Postgres password in `DATABASE_URL`.
2. Install and initialize:

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
npm run dev
```

API runs at `http://localhost:4000`.

From the repo root you can also run:

```bash
npm run dev:backend
```

## Auth

| Username | Password | Role |
|---|---|---|
| admin | demo123 | ADMIN |
| clerk | demo123 | CLERK |
| line | demo123 | LINE EXECUTIVE |

`POST /api/auth/login` and `POST /api/auth/register` return a JWT. All other `/api/*` routes need `Authorization: Bearer <token>`.

## Main endpoints

- `GET /api/dashboard`
- `GET /api/customers?q=&page=&limit=`
- `GET /api/customers/:id`
- `GET /api/customers/:id/emi-summary`
- `GET /api/customers/:id/out-payments`
- `POST /api/customers/:id/receipts`
- `GET /api/modules/:key`
- `GET /api/search?q=`
- `GET /api/users`
- `GET /api/consultancy`
- `GET /api/settings`
- `GET /api/reports/*`
- `GET /api/accounting/*`

See `../docs/ifinance-architecture-onepager.html` for a printable file map.
