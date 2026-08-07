# LIBSA HRMS

A Human Resource & Payroll Management System for **LIBSA Consultancy**, built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL, Auth, Storage, RLS).

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI primitives, Lucide Icons, React Hook Form + Zod, TanStack Table, Recharts, Framer Motion-ready
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Storage)
- **Email:** Resend API (wired for Phase 4)
- **PDF:** @react-pdf/renderer (wired for Phase 4)
- **Deployment:** Vercel + Supabase

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project + Resend keys
```

### 1. Provision the database

Run the migrations against a fresh Supabase project, in order:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
# or, against a local `supabase start` instance:
supabase db reset
```

Migrations live in `supabase/migrations/`:

| File | Contents |
|---|---|
| `0001_schema.sql` | Enums, all tables, indexes, constraints, `updated_at` triggers, new-user → profile bootstrap trigger |
| `0002_functions_views.sql` | Progressive income tax function, `compute_payroll_item`, `generate_payroll_items`, and reporting views |
| `0003_rls.sql` | Row Level Security policies for every table (role helper functions + per-table policies) |
| `0004_storage.sql` | Storage buckets (`avatars`, `employee-documents`, `payslips`, `company-assets`) and their access policies |

Optionally seed sample departments, positions, and company settings:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

### 2. Create your first Super Admin

Sign a user up via Supabase Auth (dashboard, or `supabase.auth.admin.createUser`), then set their role:

```sql
update profiles set role = 'super_admin' where email = 'you@libsaconsultancy.com';
```

### 3. Run the app

```bash
npm run dev
```

## Roles

`super_admin`, `hr_manager`, `payroll_officer`, `finance_manager`, `managing_director`, `employee`, `auditor` — enforced in three layers:

1. **Middleware** (`src/lib/supabase/middleware.ts`) redirects unauthorized roles away from restricted route segments.
2. **Row Level Security** (`supabase/migrations/0003_rls.sql`) is the source of truth — every table is protected even if the UI layer is bypassed.
3. **Server actions** (`src/actions/*`) run all writes server-side and re-check auth via the Supabase session.

## What's implemented

**Phase 1 — Foundation**
- Full normalized schema: employees, departments, positions, attendance, leave, loans, payroll periods/items, payslips + delivery tracking, notifications, audit logs, announcements, company settings
- Payroll calculation engine as SQL functions (`calculate_income_tax`, `compute_payroll_item`, `generate_payroll_items`) — NASSCORP (employee/employer), progressive income tax, allowances, loan deductions, Orange Money fees
- RLS on every table; employees can only ever read their own payroll/payslip rows
- Storage buckets with per-bucket access policies
- Auth: login, forgot password, reset password, remember me, role-based redirects
- App shell (sidebar, topbar, theme toggle, notifications) and dashboard matching the LIBSA brand

**Phase 2 — Core HR**
- Employee Management: full CRUD, tabbed form covering every field in the spec, directory with search + pagination
- Departments & Positions: CRUD, headcount + payroll cost cards
- Attendance: clock in/out, per-employee and team history
- Leave: request workflow, HR approval/rejection, balance tracking

**Phase 3 — Payroll workflow**
- Payroll Periods: create a period, generate payroll (`generate_payroll_items` RPC), and drive it through the HR → Finance → Director → Locked stages with role-gated actions
- Unified Approvals inbox aggregating pending leave, loan, and payroll decisions
- Loans & Advances: request + approve/reject, feeds `loan_deductions` in the payroll calculation
- Company Settings: NASSCORP rates, company info
- User Management (Super Admin): role assignment, activate/deactivate
- Audit Logs, In-app Notifications, Employee Self-Service landing page

## Roadmap — not yet built

These are scoped and the schema already supports them (see the in-app "coming in Phase N" panels on `/payroll/payslips`, `/reports`, `/nasscorp`):

- **Phase 4 — Payslips & delivery:** render branded PDF payslips with `@react-pdf/renderer` from locked `payroll_items`, store them in the `payslips` bucket, email each employee only their own payslip via Resend, track delivery/open status in `payslip_deliveries`, QR code + unique payslip number
- **Phase 5 — Reports & analytics:** payroll summary, department cost, tax/NASSCORP remittance, attendance, leave, loan, and bank/Orange Money transfer reports; PDF/Excel/CSV export; richer dashboard analytics
- **Phase 6 — Hardening:** automated tests, rate limiting on auth routes, CSV/Excel bulk employee import, birthday/contract-expiry notification cron (Supabase Edge Function + `pg_cron`), AI payroll assistant, and a documented deployment runbook for Vercel + Supabase

## Project structure

```
src/
  app/
    (auth)/            # login, forgot-password, reset-password
    (dashboard)/        # every authenticated module, one folder per route
    auth/callback/       # Supabase OAuth/password-reset code exchange
  actions/              # "use server" mutations, one file per domain
  components/
    ui/                 # hand-built Shadcn-style primitives (no external fetch)
    layout/              # sidebar, topbar, nav config
    dashboard/, employees/, departments/, leave/, loans/, payroll/, settings/, notifications/, attendance/, shared/
  lib/
    supabase/            # browser/server/admin clients + middleware session refresh
    validations/         # Zod schemas per domain
    audit.ts, utils.ts
  types/database.ts      # hand-maintained types mirroring the SQL schema
supabase/
  migrations/            # numbered, idempotent-where-possible SQL migrations
  seed.sql
```

## Notes for reviewers

- `npm run build` and `npx tsc --noEmit` both pass clean; `next lint` reports no warnings.
- The service-role Supabase client (`src/lib/supabase/admin.ts`) is imported with `server-only` and is not yet used by any route — it's there for the Phase 4 payslip/email pipeline, which must bypass RLS to fan out per-employee emails safely.
- Payroll amounts are computed in SQL (`compute_payroll_item`), not in application code, so the numbers shown in the UI and the numbers used for payslips can never drift apart.
