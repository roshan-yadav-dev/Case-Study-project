# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM system for a wholesale/distribution company, covering role-based auth, customer CRM, product & inventory management, and a sales challan (dispatch order) workflow with atomic stock control.

**Tech stack**
- Backend: Node.js, TypeScript, Express 5, Prisma ORM, PostgreSQL, Zod validation, JWT auth
- Frontend: React, TypeScript, Vite, Axios
- Testing: Node's built-in test runner (`tsx --test`)

---

## 1. Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Data models (User, Customer, Product, Challan, ...)
│   │   ├── migrations/         # SQL migration history
│   │   └── seed.ts             # Seeds 4 role users + sample customers/products
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # Business logic (stock math, challan lifecycle, etc.)
│   │   ├── validators/         # Zod request schemas
│   │   ├── middleware/         # JWT auth + role-based access control
│   │   ├── routes/             # Express routers
│   │   └── app.ts / server.ts  # App bootstrap
│   └── tests/                  # Integration tests per module
└── frontend/
    └── src/
        ├── pages/               # Dashboard, Customers, Products, Challans, Login
        ├── services/            # Axios API clients per module
        └── context/             # Auth context (JWT storage, current user)
```

---

## 2. Prerequisites

- Node.js 18+
- npm
- A PostgreSQL 14+ instance (local install, Docker container, or a free hosted instance such as Neon/Supabase/Render Postgres)

---

## 3. Environment Variables

### Backend (`backend/.env`)

Copy the example file and fill in real values:

```bash
cd backend
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the API server listens on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/mini_erp_crm` |
| `JWT_SECRET` | Secret used to sign JWTs — use a long random string, never commit a real one | `openssl rand -hex 32` output |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `FRONTEND_URL` | Used for CORS | `http://localhost:5173` |

> **Note:** `.env.example` previously contained a real-looking placeholder password. If you copy it, replace it with your own local credentials — never commit `.env`.

### Frontend (`frontend/.env`, optional)

| Variable | Description | Default if unset |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend calls | `http://localhost:5000/api` |

Only needed if your backend isn't running on `localhost:5000` (e.g. when pointing the frontend at a deployed backend).

---

## 4. Running Locally

### Backend

```bash
cd backend
npm install

# Apply DB schema
npx prisma migrate dev

# Seed 4 role users + sample customers/products
npm run seed

# Start dev server (http://localhost:5000)
npm run dev
```

Verify it's up: `GET http://localhost:5000/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` by default and talks to the backend at `http://localhost:5000/api`.

### Running Tests

```bash
cd backend
npm test
```

Runs the integration test suite (`tests/*.test.ts`) covering auth, customers, products, inventory, challans, and dashboard.

---

## 5. Test Login Credentials (from seed data)

All seeded users share the same password: **`Password@123`**

| Role | Email |
|---|---|
| Admin | `admin@example.com` |
| Sales | `sales@example.com` |
| Warehouse | `warehouse@example.com` |
| Accounts | `accounts@example.com` |

The seed script also creates 3 sample customers and 3 sample products so the Customer, Product, and Challan flows can be exercised immediately after seeding.

---

## 6. API Overview

Base URL: `http://localhost:5000/api`

All endpoints except `POST /auth/login` require a `Bearer <token>` from login. See `postman_collection.json` in the repo root for a ready-to-import collection with example bodies, or the table below for a quick reference.

| Module | Method & Path | Roles Allowed |
|---|---|---|
| Auth | `POST /auth/login` | Public |
| Auth | `GET /auth/me` | Any authenticated user |
| Customers | `POST /customers` | Admin, Sales |
| Customers | `GET /customers` (paginated, search, status/type filter) | All 4 |
| Customers | `GET /customers/:id` | All 4 |
| Customers | `PATCH /customers/:id` | Admin, Sales |
| Customers | `POST /customers/:id/followups` | Admin, Sales |
| Products | `POST /products` | Admin, Warehouse |
| Products | `GET /products` (paginated, search, category/location/low-stock filter) | All 4 |
| Products | `GET /products/:id` | All 4 |
| Products | `PATCH /products/:id` | Admin, Warehouse |
| Inventory | `GET /inventory` | All 4 |
| Inventory | `GET /inventory/low-stock` | All 4 |
| Inventory | `GET /inventory/:productId/movements` | All 4 |
| Inventory | `POST /inventory/:productId/stock-in` | Admin, Warehouse |
| Challans | `POST /challans` (creates DRAFT) | Admin, Sales |
| Challans | `GET /challans` (paginated, search, status filter) | All 4 |
| Challans | `GET /challans/:id` | All 4 |
| Challans | `PATCH /challans/:id` (DRAFT only) | Admin, Sales |
| Challans | `POST /challans/:id/confirm` (reduces stock atomically) | Admin, Sales |
| Challans | `POST /challans/:id/cancel` | Admin, Sales |
| Dashboard | `GET /dashboard/summary` `/sales-summary` `/low-stock` `/recent-activity` | All 4 |

---

## 7. Architecture Notes

- **Auth**: JWT issued on login (`/auth/login`), verified by `authenticate` middleware on every protected route; role checks enforced separately by `authorizeRoles(...roles)` per route.
- **Stock safety**: Confirming a challan runs inside a single Prisma transaction. Each line item is deducted with a conditional `UPDATE ... WHERE currentStock >= quantity`, so concurrent confirmations cannot push stock negative; if any item is short, the whole transaction rolls back and a `409/400` with per-item shortfall detail is returned.
- **Product snapshots**: `ChallanItem` stores `productNameSnapshot`, `skuSnapshot`, and `unitPriceSnapshot` at creation time, so historical challans stay accurate even if the product record is edited later.
- **Audit trail**: Every stock change (`stock-in` or challan confirmation) writes a `StockMovement` row with type, quantity, reason, and the user who performed it.
- **Validation**: All request bodies/queries are parsed with Zod schemas before hitting business logic; invalid input returns `400` with field-level messages.

---

## 8. Deployment

This project is not currently deployed to a live URL. To run it, follow the local setup steps above against your own PostgreSQL instance. It can be deployed by:
- Backend → Render / Railway / Fly.io (set the env vars from section 3, run `npm run build && npm start`)
- Frontend → Vercel / Netlify (set `VITE_API_BASE_URL` to the deployed backend's `/api` URL)
- Database → Neon / Supabase / Render Postgres

---

## 9. Assumptions Made

- A single default password (`Password@123`) is used for all seeded demo users; this is not meant to reflect production password policy.
- "Search" on list endpoints is a case-insensitive partial match on the most relevant text fields (e.g. customer name/business name, product name/SKU, challan number), not full-text search.
- Only `DRAFT` challans can be edited or cancelled; once `CONFIRMED`, a challan and its stock effect are treated as immutable/historical.
- Stock adjustments outside the challan flow are limited to `stock-in` (restocking); the case study did not specify a manual stock-out/adjustment endpoint outside of challans, so one wasn't added.

## 10. Known Limitations

- No live deployment yet (see section 8).
- No PDF export for challans/invoices (listed as a bonus item).
- No Docker setup or CI/CD pipeline (listed as bonus items).
- No file/image upload (e.g. product images to S3) — not required by the core spec.
