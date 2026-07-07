# Commission & Payroll Management System

A multi-tenant platform for managing sales commissions, agent payouts, and staff
payroll for retail businesses — built with Next.js, React, and a built-in
SQLite database. No cloud database, API keys, or accounts required.

## Quick Start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

That's it. On first run the app automatically creates a local database file at
`data/payroll.db`, sets up all the tables, and seeds it with a demo shop,
agents, staff, and sample transactions so there's data to explore immediately.

### Requirements

- **Node.js 22.5 or newer** (the app uses Node's built-in SQLite support, so
  no native modules need to be compiled — it works the same on Windows,
  macOS, and Linux with nothing extra to install).

### Demo Credentials

- **Shop Owner login**: `admin@tiles.com` (this demo build treats the email
  field as the login — see "Known limitations" below)
- **Agent login**: phone number `9876543210`

### Resetting the demo data

If you want a clean slate:

```bash
npm run db:reset
```

This deletes the local database file; it will be recreated with fresh demo
data the next time you run `npm run dev` or `npm start`.

### Production-style run

```bash
npm run build
npm start
```

## Features

- **Multi-tenant architecture** — each shop's data (sales, staff, payouts) is
  isolated by `shop_id` on every query.
- **Dual login flows** — separate entry points for shop owners and commission
  agents.
- **Agent management** — a global agent registry that can be linked to
  multiple shops, each with its own commission rate.
- **Sales & commission tracking** — record sales, auto-calculate commission,
  and see paid vs. pending amounts.
- **Payouts** — record commission payments to agents and see running
  pending balances.
- **Staff & payroll** — manage staff records, mark daily attendance, track
  advances, and generate monthly salary based on attendance.
- **Reports** — top agents by sales/commission, monthly payroll trend, and
  shop-wide totals.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API routes
- **Database**: SQLite via Node's built-in `node:sqlite` module — the
  database lives in a single file (`data/payroll.db`) alongside the app

## Project Structure

```
app/
├── auth/                  # Shop owner + agent login/register pages
├── shop/[shopId]/         # Shop owner dashboard, agents, sales, payouts,
│                          # staff, attendance, salary, reports
├── agent/                 # Agent dashboard + commissions view
└── api/                   # All backend routes (auth, shops, agents, reports)
components/                # UI components (shadcn/ui) + app-specific components
lib/
├── db.ts                  # SQLite connection, schema setup, demo data seeding
├── auth.ts                # Password hashing / session helpers
└── types.ts                # Shared TypeScript types
scripts/
├── init-db.sqlite.sql     # Database schema
└── reset-db.js            # Wipes the local database file
data/
└── payroll.db             # Created automatically on first run (git-ignored)
```

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/shop-login` | Shop owner login |
| POST | `/api/auth/shop-register` | Shop owner registration |
| POST | `/api/auth/agent-login` | Agent login |
| POST | `/api/auth/agent-register` | Agent registration |
| GET | `/api/shops/:shopId/dashboard` | Dashboard metrics |
| GET/POST | `/api/shops/:shopId/agents` | List / link agents |
| DELETE | `/api/shops/:shopId/agents/:linkId` | Unlink an agent |
| GET | `/api/shops/:shopId/agents/pending` | Agents with pending commission |
| GET/POST | `/api/shops/:shopId/sales` | List / record sales |
| GET/POST | `/api/shops/:shopId/payouts` | List / record payouts |
| GET/POST | `/api/shops/:shopId/staff` | List / add staff |
| GET/POST | `/api/shops/:shopId/attendance` | Get / mark daily attendance |
| GET | `/api/shops/:shopId/salary` | List salary records for a month |
| POST | `/api/shops/:shopId/salary/generate` | Generate salary for a month |
| POST | `/api/shops/:shopId/salary/:salaryId/mark-paid` | Mark salary as paid |
| GET | `/api/shops/:shopId/reports` | Analytics and totals |
| GET | `/api/agents/:agentId/dashboard` | Agent's cross-shop dashboard |
| GET | `/api/agents/:agentId/commissions` | Agent's commission history for a shop |

## Known limitations (by design, for a local demo build)

This is set up to be an easy, self-contained demo rather than a hardened
multi-user production deployment. A few things a real deployment would need
that are intentionally simplified here:

- **Login is a lightweight demo flow.** Shop login only checks the email
  address exists (there's no password field in the UI, matching the
  original prototype), and the "Bearer" tokens sent by the client aren't
  verified server-side. Don't expose this build on the open internet as-is.
- **Single SQLite file, single process.** Great for a local demo or a
  small single-shop deployment; a multi-instance production deployment
  would want a shared database (e.g., Postgres) instead.
- Email notifications, bulk import/export, and audit logging are not
  implemented.

## License

Proprietary — All rights reserved.
