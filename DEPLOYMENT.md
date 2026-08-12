# ERP CRM — Production Deployment Guide

This document outlines the step-by-step production deployment instructions for the Mini ERP + CRM application.

---

## 1. Target Production Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                   Vercel Frontend                        │
│                React + TypeScript + Vite                 │
│                 Production Static Build                  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ HTTPS / REST API
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Render Backend                         │
│               Node.js + Express + TypeScript             │
│                Prisma ORM (v7) + JWT Auth                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ Prisma Client & Pg Pool (SSL)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Neon Database                          │
│               PostgreSQL Serverless Cloud                │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Neon PostgreSQL Setup

1. Sign up/Log in to **[Neon Cloud](https://neon.tech/)**.
2. Create a new PostgreSQL Project (e.g. `mini-erp-crm`).
3. In the Neon Dashboard:
   - Copy the **Pooled Connection String** and set it as `DATABASE_URL`.
   - Copy the **Direct (Unpooled) Connection String** and set it as `DIRECT_URL`.
   - Ensure `?sslmode=require` is appended to both connection strings.
4. Keep these credentials ready for Render environment configuration.

---

## 3. Database Migration Execution

Before running the backend in production for the first time, execute Prisma migrations against your Neon database from your terminal:

```bash
cd backend
export DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"

# Generate Prisma Client
npx prisma generate

# Apply pending production migrations
npx prisma migrate deploy

# (Optional) Seed initial system users and product catalog data
npx tsx prisma/seed.ts
```

> **IMPORTANT**: Never run `prisma migrate reset` in production as it drops database tables and destroys production data.

---

## 4. Render Backend Deployment

1. Sign up/Log in to **[Render](https://render.com/)**.
2. Click **New +** → **Web Service**.
3. Connect your GitHub / GitLab repository containing this project.
4. Configure the service settings:
   - **Name**: `mini-erp-crm-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run render:build` (or `npm install && npx prisma generate && npm run build`)
   - **Start Command**: `npm run render:start` (or `npx prisma migrate deploy && npm start`)
   - **Health Check Path**: `/health`

5. Add the following **Environment Variables** under the service configuration:

| Environment Variable | Description / Recommended Value |
|----------------------|---------------------------------|
| `NODE_ENV`           | `production`                    |
| `PORT`               | `10000` (or leave default assigned by Render) |
| `DATABASE_URL`       | Your Neon Pooled Postgres Connection String |
| `DIRECT_URL`         | Your Neon Direct Postgres Connection String |
| `JWT_SECRET`         | Random secure secret key (min 32 chars) |
| `JWT_EXPIRES_IN`     | `1d`                            |
| `CORS_ORIGIN`        | `https://your-frontend.vercel.app` (set after creating Vercel app) |

6. Deploy the service and note your Render URL (e.g. `https://mini-erp-crm-backend.onrender.com`).

---

## 5. Backend Verification

Verify backend deployment health by making an HTTP GET request to the health endpoint:

```bash
curl -i https://mini-erp-crm-backend.onrender.com/health
```

Expected Response:
```json
{
  "status": "ok"
}
```

Database connectivity check:
```bash
curl -i https://mini-erp-crm-backend.onrender.com/health/db
```

Expected Response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 6. Vercel Frontend Deployment

1. Sign up/Log in to **[Vercel](https://vercel.com/)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub / GitLab repository.
4. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add the **Environment Variable**:

| Environment Variable | Value |
|----------------------|-------|
| `VITE_API_URL`       | `https://mini-erp-crm-backend.onrender.com` |

6. Click **Deploy**. Vercel will build and host your frontend (e.g. `https://mini-erp-crm-frontend.vercel.app`).

---

## 7. Post-Deployment CORS Update

Once the Vercel app is deployed and you have its production domain:

1. Return to your **Render Dashboard** → `mini-erp-crm-backend` → **Environment**.
2. Update `CORS_ORIGIN` to your exact Vercel frontend URL:
   ```text
   CORS_ORIGIN=https://mini-erp-crm-frontend.vercel.app
   ```
3. Save changes. Render will automatically redeploy the backend service with the updated CORS policy.

---

## 8. Deployment Order Summary

```text
1. Neon Database Creation
   └─ Create project & obtain DATABASE_URL + DIRECT_URL

2. Prisma Migration & Seed
   └─ Run `npx prisma migrate deploy`

3. Render Backend Service Creation
   └─ Set env vars & build/start commands

4. Backend Verification
   └─ Test GET /health & GET /health/db

5. Vercel Frontend Creation
   └─ Set VITE_API_URL & build dist

6. CORS Policy Synchronization
   └─ Set CORS_ORIGIN on Render to match Vercel URL

7. Production Smoke Test
   └─ Execute end-to-end verification flow
```

---

## 9. Production Smoke Test Checklist

Execute these checks after full deployment:

- [ ] **Frontend Loading**: Navigate to `https://<vercel-url>` -> Login page loads cleanly.
- [ ] **SPA Direct Navigation**: Directly visit `https://<vercel-url>/login` and `https://<vercel-url>/dashboard` without receiving a 404.
- [ ] **Authentication**: Log in with seeded admin/sales credentials -> Receive JWT token.
- [ ] **Protected Routes**: Access CRM, Product Catalog, Inventory, and Sales Challan pages.
- [ ] **Customer CRM**: Create a new customer -> View in list -> Add follow-up.
- [ ] **Product Catalog**: Create a product -> Verify stock levels and minimum threshold alert.
- [ ] **Draft Sales Challan**: Create a new Sales Delivery Challan in `DRAFT` status -> Check product snapshots.
- [ ] **Challan Confirmation**: Confirm the Sales Challan -> Verify stock decreases atomically.
- [ ] **Negative Stock Protection**: Attempt to confirm a Challan requesting more units than available stock -> Verify proper `400 Bad Request` rejection and transaction rollback.
- [ ] **Dashboard Metrics**: Check real-time summary cards, sales aggregation, low-stock table, and recent activity log.
- [ ] **Logout**: Click Logout -> JWT token cleared and redirected to `/login`.
