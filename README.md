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

Migrations live in `supabase/migrations/` and must be applied **in order** — later files alter and depend on tables/functions/policies created by earlier ones:

| File | Contents |
|---|---|
| `0001_schema.sql` | Enums, all tables, indexes, constraints, `updated_at` triggers, new-user → profile bootstrap trigger |
| `0002_functions_views.sql` | Progressive income tax function, `compute_payroll_item`, `generate_payroll_items`, and reporting views |
| `0003_rls.sql` | Row Level Security policies for every table (role helper functions + per-table policies) |
| `0004_storage.sql` | Storage buckets (`avatars`, `employee-documents`, `payslips`, `company-assets`) and their access policies |
| `0005_multi_company.sql` | Adds `companies` (replacing the single-row `company_settings`) and `company_memberships`; scopes every table with a `company_id`; re-scopes the payroll engine and views per company |
| `0006_multi_company_rls.sql` | Rewrites every RLS policy (and the four storage policies) to be company-scoped instead of single-tenant |
| `0007_default_company.sql` | Adds `profiles.default_company_id` and a `set_default_company` RPC so a company's HR/Admin can pin which company a user lands in after login |
| `0008_employee_photos.sql` | Adds the public `employee-photos` storage bucket (company-scoped by path, not by an `employees` row lookup, so a photo can be attached while creating a brand-new employee) |
| `0009_probation_status.sql` | Adds `'probation'` to the `employment_status` enum |
| `0010_employee_directory_extra_fields.sql` | Appends `gender` and `tin` to the `v_employee_directory` view for the Employee Database page's stat cards and name-card TIN line |
| `0011_payments_processed_stage.sql` | Adds `'payments_processed'` as the sixth (final) stage of `payroll_approval_stage`, after `payslips_sent` |
| `0012_public_holidays.sql` | Adds the company-scoped `public_holidays` table (backs the Public Holidays page and the leave calendar) |

Then seed a starter company with sample departments, positions, and announcements:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

### 2. Create your first Super Admin

Sign a user up via Supabase Auth (dashboard, or `supabase.auth.admin.createUser`), then promote them to the platform-admin role:

```sql
update profiles set role = 'super_admin' where email = 'you@libsaconsultancy.com';
```

A Super Admin can access every company without an explicit membership row. Everyone else needs a `company_memberships` row (or an `employees` row, for a client's own staff) for each company they should see — set up through the in-app **Companies** page.

### 3. Run the app

```bash
npm run dev
```

## Multi-company model

LIBSA Consultancy provides HR/payroll as a service to multiple client companies, each fully isolated from the others:

- **`companies`** — one row per client (replaces the old single-row `company_settings`). Each has its own NASSCORP rates, tax bands, currency, and Orange Money fees.
- **`company_memberships`** — grants a profile a role (`hr_manager`, `payroll_officer`, `finance_manager`, `managing_director`, `auditor`) scoped to one company. A LIBSA staffer can hold different roles at different client companies simultaneously.
- **`profiles.role = 'super_admin'`** is the one platform-wide role — it bypasses per-company checks everywhere (`is_platform_admin()` in the RLS helper functions) and is how LIBSA's own platform operators manage the client roster from `/companies`.
- A client's own employees don't need a membership row at all — their `employees.profile_id` + `employees.company_id` is enough for self-service access (attendance, leave, payslips) to their one employer.
- Every domain table (`employees`, `departments`, `payroll_periods`, `loans`, `audit_logs`, …) carries a `company_id`, and every RLS policy checks it — see `supabase/migrations/0006_multi_company_rls.sql`.
- The UI's **company switcher** (top of the sidebar) sets a `current_company_id` cookie (`src/lib/company.ts`, `src/actions/company.ts`); every server action and page query filters by it.
- A user who belongs to more than one company sees a **"Choose a company"** picker right after login (`/select-company`) — unless a company's HR/Admin has pinned a **default company** for them (the ⭐ button on that company's Team list), in which case they skip the picker and land straight there. The switcher/picker are still available afterward to change companies.

## Roles

`super_admin`, `hr_manager`, `payroll_officer`, `finance_manager`, `managing_director`, `employee`, `auditor` — enforced in three layers:

1. **Middleware** (`src/lib/supabase/middleware.ts`) redirects unauthorized roles away from restricted route segments, and redirects any user with zero company access to `/companies`.
2. **Row Level Security** (`supabase/migrations/0003_rls.sql`, rewritten to be company-scoped in `0006_multi_company_rls.sql`) is the source of truth — every table is protected even if the UI layer is bypassed.
3. **Server actions** (`src/actions/*`) run all writes server-side, re-check auth via the Supabase session, and scope inserts to the current company.

## What's implemented

**Phase 1 — Foundation**
- Full normalized schema: employees, departments, positions, attendance, leave, loans, payroll periods/items, payslips + delivery tracking, notifications, audit logs, announcements, company settings
- Payroll calculation engine as SQL functions (`calculate_income_tax`, `compute_payroll_item`, `generate_payroll_items`) — NASSCORP (employee/employer), progressive income tax, allowances, loan deductions, Orange Money fees
- RLS on every table; employees can only ever read their own payroll/payslip rows
- Storage buckets with per-bucket access policies
- Auth: login, forgot password, reset password, remember me, role-based redirects
- App shell (sidebar, topbar, theme toggle, notifications) and dashboard matching the LIBSA brand

**Phase 2 — Core HR**
- Employee Management: full CRUD, tabbed form (with photo upload) covering every field in the spec; Employee Database view with gender/probation/inactive stat cards, department/status/type filters, checkbox multi-select + bulk delete, numbered pagination, and CSV Import/Export
- Departments & Positions: CRUD, headcount + payroll cost cards
- Attendance: clock in/out, per-employee and team history
- Leave Dashboard (`/leave`): stat cards (total/approved/pending/rejected this month, today's absences), department/type filters, status tabs with counts, a paginated request table, a Leave Balance Summary sidebar card, and Quick Actions; plus a real Leave Calendar (`/leave/calendar`, month grid with holidays + approved leave), a dedicated Leave Balance page (`/leave/balance`), and Public Holidays CRUD (`/leave/holidays`)

**Phase 3 — Payroll workflow**
- Payroll Dashboard (`/payroll`): current-period stat cards, the 6-stage approval workflow, a paginated periods table with Created By and a real per-period detail page (`/payroll/periods/[id]`, with a CSV export of the employee-level breakdown), Department Payroll Summary, a Deductions Breakdown donut chart, a Payroll Summary card, Quick Actions, and a Payroll Activities feed sourced from `audit_logs`
- Payroll Periods: create a period, generate payroll (`generate_payroll_items` RPC), and drive it through the HR → Finance → Director → Locked stages with role-gated actions
- Unified Approvals inbox aggregating pending leave, loan, and payroll decisions
- Loans & Advances: request + approve/reject, feeds `loan_deductions` in the payroll calculation
- Company Settings: NASSCORP rates, company info (per company)
- User Management (Super Admin): platform role assignment, activate/deactivate
- Companies (Super Admin): create client companies, invite/remove staff with a per-company role, company switcher
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
- The service-role Supabase client (`src/lib/supabase/admin.ts`) is imported with `server-only`. It's used narrowly today — `inviteMember` needs it to look up a brand-new invitee's profile by email, since a person who shares no company with the inviter yet is invisible to the inviter under RLS. It's also reserved for the Phase 4 payslip/email pipeline, which must bypass RLS to fan out per-employee emails safely.
- Payroll amounts are computed in SQL (`compute_payroll_item`), not in application code, so the numbers shown in the UI and the numbers used for payslips can never drift apart.
- **`0005`/`0006` (multi-company) were written and reviewed without a live database to run them against** — this sandbox's network policy blocks outbound access to Supabase. They were checked carefully by hand (and two real bugs were caught this way: a `CREATE OR REPLACE VIEW` column-reordering violation, and a dangling function-overload dependency), but please run them against a staging project before production and report back if anything errors partway through.
