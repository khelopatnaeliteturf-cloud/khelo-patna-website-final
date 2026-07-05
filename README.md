# Khelo Patna — Academy Management System

Sports facility and academy ERP for Khelo Patna (Patna, Bihar). Combines a public booking website with a staff admin dashboard for turf operations and academy management.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18 |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Payments | Cashfree (with dev mock fallback) |

## Project structure

```
├── backend/          Express API + MongoDB
├── frontend/         Next.js app (public site + admin ERP)
└── legacy_static_backup/   Archived static site
```

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a remote `MONGODB_URI`)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed          # Creates tenant, staff, coaches, batches, fee structure
npm run dev           # http://localhost:5001
```

**Default staff logins** (after seed):

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | SUPER_ADMIN |
| manager | manager123 | BRANCH_MANAGER |
| counsellor | counsellor123 | RECEPTIONIST |

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev           # http://localhost:3000
```

- Public site: `http://localhost:3000`
- Staff login: `http://localhost:3000/login`
- Admin ERP: `http://localhost:3000/admin`
- Parent fee portal: `http://localhost:3000/academy/pay-fees`

## Academy management features

### Core workflows

- **Student admission** — Auto membership ID (`KP-0001`), first-month invoice, WhatsApp welcome
- **Enquiry pipeline** — Public form → admin review → one-click convert to student
- **Fee collection** — Counter payments + parent online portal (Cashfree)
- **Monthly billing** — Generate recurring invoices for all active students (admin button or cron job)
- **Attendance** — Daily roll call by sport with WhatsApp notifications
- **Sessions** — Academic year management and student promotion
- **Batches & coaches** — Roster assignment, capacity tracking
- **Fee structure** — Persisted per-sport billing config (cricket/football rates)

### Admin ERP modules

| Module | Path in admin |
|--------|---------------|
| Memberships | Sidebar → Memberships |
| Sessions | Sidebar → Sessions |
| Batches | Sidebar → Batches |
| Coaches | Sidebar → Coaches |
| Attendance | Sidebar → Attendance |
| Billing | Sidebar → Billing |
| Staff | Sidebar → Staff |

### Monthly billing cron

Run on the 1st of each month:

```bash
cd backend
npm run billing:monthly
```

Cron example: `0 6 1 * * cd /path/to/backend && node jobs/generateMonthlyFees.js`

## API overview

All routes under `/api`:

- `POST /auth/login`, `POST /auth/register`, `GET /auth/staff`, `GET /auth/me`
- `GET/POST/PUT /academy/students` — Student CRM
- `POST /academy/students/:id/fees` — Counter fee collection
- `GET /academy/dues` — Parent dues lookup (public)
- `POST /academy/billing/generate-monthly` — Recurring invoice generation
- `POST /academy/enquiries/:id/convert` — Enquiry → student admission
- `GET/PUT /academy/fee-structure` — Billing configuration
- `POST/GET /academy/attendance` — Attendance tracking
- `GET/POST/PUT /academy/sessions` — Academic sessions
- `GET/POST/PUT /academy/coaches`, `/academy/batches`

## Recent reliability improvements

- Fixed `Fee` and `Enquiry` schemas with `tenantId`/`branchId` for correct multi-tenant reporting
- Unified staff roles between frontend and backend (`SUPER_ADMIN`, `RECEPTIONIST`, etc.)
- Staff directory now loads from database (`GET /auth/staff`)
- Fixed broken academy navigation and parent dues endpoint (`Tenant` import)
- Added persisted fee structure and automated monthly billing
- Enquiry-to-admission conversion pipeline

## Production checklist

- [ ] Set strong `JWT_SECRET` in backend `.env`
- [ ] Configure `CASHFREE_*` credentials for live payments
- [ ] Lock CORS to your frontend domain in `server.js`
- [ ] Set up monthly billing cron job
- [ ] Configure WhatsApp and email integrations

## License

Private — Khelo Patna
