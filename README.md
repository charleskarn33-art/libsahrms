# LIBSA HRMS

A Human Resource & Payroll Management System for **LIBSA Consultancy**, built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL, Auth, Storage, RLS).

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI primitives, Lucide Icons, React Hook Form + Zod, TanStack Table, Recharts, Framer Motion-ready
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Storage)
- **Email:** Resend API — payslip delivery (Phase 4)
- **PDF:** @react-pdf/renderer — payslips (Phase 4) and tabular reports (Phase 5)
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
| `0013_tax_remittances.sql` | Adds `tax_remittances` — one row per payroll period recording that WHT + NASSCORP were actually paid to the government (payment date, receipt reference, status). Amounts aren't duplicated into it; they're derived live from `payroll_items`/`v_payroll_period_summary` — this table tracks the fact and evidence of remittance only |
| `0014_benefits.sql` | Adds `benefit_providers`, `benefit_plans`, `benefit_enrollments`, `benefit_dependents`, and `benefit_claims`, with RLS matching the loans/leave pattern (self can see own, HR/payroll manage, management can view) |

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

**Phase 4 — Payslips & delivery**
- `generatePayslips` (`src/actions/payslips.ts`): once a period is `locked`, renders one A4 PDF per employee with `@react-pdf/renderer` (`src/lib/payslip-pdf.tsx`) — a plain black-and-white "End of Month Payslip" ledger layout matching a reference design: company logo/name, an employee + period info grid (ID, job title, date of hire, period, bank/Orange Money or NASSCORP/TIN details), a two-column Earnings/Deductions table with accounting-style single/double rules under the subtotals, a bold net-pay line, and a NASSCORP Contribution breakdown (employee/employer/total) — uploads each to the `payslips` storage bucket, inserts a `payslips` row with a globally-unique `{COMPANY_SLUG}-{YYYYMM}-{employeeNumber}` payslip number, and queues a `payslip_deliveries` row (idempotent — re-running only fills gaps, never duplicates)
- `/payroll/payslips`: period picker, a generate-payslips empty state, and once generated, a table of every payslip with delivery-status badges, in-browser View/Download (`/api/payslips/[id]`, RLS-gated — the route does no manual role check because a row the caller can't `select` is invisible), per-row Send/Resend, and bulk Send All / Retry Failed / Mark Payments Processed actions — reusing the dashboard's Payslip Distribution donut
- Email delivery via Resend (`src/lib/resend.ts`, `src/lib/email-templates.ts`): each employee is emailed only their own payslip PDF as an attachment; `payslip_deliveries.status` moves `queued → sent` or `queued → failed` with the error message stored for retry
- `markPaymentsProcessed` closes the loop: once payslips are sent, payroll staff can mark the period `paid` (`approval_stage: payments_processed`), the final stage in the workflow
- **Honest gap:** `delivered`/`opened` are real states in the `PayslipDeliveryStatus` type and schema, but nothing populates them yet — that requires wiring a Resend webhook (delivery/open events) to update `payslip_deliveries`, which is not implemented. Only `queued`, `sent`, and `failed` are reachable today.
- **Not yet verified against a live environment:** the PDF pipeline was smoke-tested locally (rendered and rasterized a real payslip PDF to confirm layout), and `generatePayslips`/`sendOneDelivery` type-check and build clean, but neither has been run against the live Supabase project or a real Resend account from this sandbox (network policy blocks both) — please test one full generate → send cycle on staging before relying on it for real payroll.

**Phase 5 — Reports & analytics**
- `/reports`: a hub linking to every report below.
- **Payroll Summary** (`/reports/payroll`): every payroll period with gross/deductions/net/NASSCORP/tax, a salary cost trend chart, and YTD stat cards — sourced from `v_payroll_period_summary` joined to `payroll_periods` for date ordering.
- **Department Cost** (`/reports/departments`): current establishment headcount + basic salary from `v_department_headcount`, plus actual payroll cost by department for a selected locked/paid period (aggregated from `payroll_items`).
- **Tax & NASSCORP Overview** (`/nasscorp`, rebuilt to match a reference dashboard design): period-over-period stat cards (WHT, employee/employer/total NASSCORP with % change vs. the prior period), a WHT bracket summary table (each employee bucketed into their company's progressive `income_tax_bands`, via `src/lib/tax-bands.ts`), a NASSCORP this-period/prior-period/YTD summary, WHT and NASSCORP trend charts (last 6 periods), a Current Rates sidebar card, and a **Recent Tax & NASSCORP Payments** table backed by the new `tax_remittances` table — payroll/finance staff record the payment date and receipt reference once WHT + NASSCORP are actually remitted (`recordTaxRemittance` in `src/actions/tax-remittance.ts`), which also drives a Compliance Status card (compliant unless an older locked period has no recorded remittance). CSV export of the per-employee detail and a printable PDF (`/api/reports/nasscorp/[periodId]`) are both available.
- **Bank & Orange Money Transfers** (`/reports/payments`): per-employee net pay with bank/Orange Money details for a selected period — the document finance actually hands to the bank — with CSV and PDF export (`/api/reports/payments/[periodId]`).
- **Attendance** (`/reports/attendance`): present/late/absent/on-leave counts and overtime hours per employee over a date range (native `<input type="date">` GET form, no client JS needed for the range picker).
- **Leave** (`/reports/leave`): approved leave days broken down by type and by department, plus the full request detail, over a date range.
- **Loans & Advances** (`/reports/loans`): every loan/advance with principal, monthly deduction, balance remaining, and status, plus outstanding-balance stat cards.
- `src/lib/report-pdf.tsx`: a reusable generic tabular PDF renderer (`@react-pdf/renderer`, landscape A4, header/body/optional bold totals row) shared by the NASSCORP and payments PDF routes — the payslip PDF (Phase 4) has its own richer layout and stays separate.
- **Scope note:** export is CSV (opens fine in Excel) plus PDF for the two documents that are genuinely handed to a bank or a statutory authority (remittance, transfers). A dedicated Excel (`.xlsx`) exporter was deliberately left out — it would mean a new heavy dependency for a format CSV already covers with no loss of data.
- The report PDF pipeline was smoke-tested the same way as the Phase 4 payslip PDF (rendered and rasterized to confirm layout), since `@react-pdf/renderer` runtime issues aren't caught by type-checking.

**Benefits Administration** (previously an unmodeled Phase 6 placeholder, built out to match a reference design)
- Schema (migration `0014`): `benefit_providers`, `benefit_plans` (per-plan annual company/employee contribution budget, not a per-employee rate), `benefit_enrollments`, `benefit_dependents` (tied to a specific enrollment), and `benefit_claims`.
- `/benefits` (Overview): stat cards (total employees, enrolled employees, active plans, total annual company cost), a Benefits Plan Summary table, a Benefit Enrollment Overview donut (slice size = enrollment count per plan, legend % = participation rate against total headcount, not slice share), Recent Enrollments, a Claims Summary + Claims Trend chart for the current year, Quick Actions, and the same `Announcements` card used on the main dashboard.
- `/benefits/plans`, `/benefits/enrollments` (+ dependents via a per-row dialog), `/benefits/claims` (file + approve/reject), `/benefits/providers`: full CRUD for each, all real data, no placeholders.
- `/benefits/dependents`: read-only roll-up of everyone covered under an enrollment; `/benefits/settings` redirects to `/benefits/plans`, the same pattern `/payroll/settings` uses to redirect to `/settings`.
- **Scope trim:** the reference design's sidebar and stat cards implied a couple of things not built: per-stat-card sparkline trends (no natural time-series backs a point-in-time count like "active plans", so these were dropped rather than faked) and an "Important Information" card with invented open-enrollment/policy-update content (replaced with the real, already-existing company `Announcements` feed instead of fabricated copy).
- Closed a real gap while building this: `/benefits` wasn't in the middleware's per-route role table, so — like a couple of pre-existing pages (`/nasscorp`) — the sidebar hid it from plain `employee` users but a direct URL wouldn't have been blocked. Added `benefits` to `ROUTE_ROLES` in `src/lib/supabase/middleware.ts`, matching the roles the nav item already declared. RLS on the new tables was correct from the start regardless (an employee querying `benefit_enrollments`/`benefit_claims` only ever gets their own rows).
- **Not yet verified against a live environment** — same constraint as everything else in this session; `tsc`/`build`/`lint` pass clean and the queries were reviewed by hand, but this hasn't been clicked through in a live browser.

## Roadmap — not yet built

- **Phase 6 — Hardening:** automated tests, rate limiting on auth routes, CSV/Excel bulk employee import, birthday/contract-expiry notification cron (Supabase Edge Function + `pg_cron`), AI payroll assistant, Resend delivery/open webhooks, and a documented deployment runbook for Vercel + Supabase

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
- The service-role Supabase client (`src/lib/supabase/admin.ts`) is imported with `server-only`. It's used narrowly — `inviteMember` needs it to look up a brand-new invitee's profile by email, since a person who shares no company with the inviter yet is invisible to the inviter under RLS. The Phase 4 payslip/email pipeline turned out not to need it: the `payslips` bucket's storage policies (`0006_multi_company_rls.sql`) already grant payroll staff and the owning employee read access under RLS, so `generatePayslips`/`sendOneDelivery` run entirely on the regular authenticated client.
- Payroll amounts are computed in SQL (`compute_payroll_item`), not in application code, so the numbers shown in the UI and the numbers used for payslips can never drift apart.
- **`0005`/`0006` (multi-company) were written and reviewed without a live database to run them against** — this sandbox's network policy blocks outbound access to Supabase. They were checked carefully by hand (and two real bugs were caught this way: a `CREATE OR REPLACE VIEW` column-reordering violation, and a dangling function-overload dependency), but please run them against a staging project before production and report back if anything errors partway through.
- **The `/nasscorp` Overview redesign was not visually checked in a live browser** — same network constraint, no live Supabase session to sign in with from here. Every query, the tax-band bucketing (`bucketByTaxBand`), and the remittance compliance logic were reviewed by hand and `tsc`/`build`/`lint` all pass, but please open the page against real payroll data once migration `0013` is applied.
- **Scope trim on `/nasscorp`:** the reference design's sidebar implied several more sub-pages (Tax Management, WHT, NASSCORP Management, Contributions) beyond Overview. Only Overview was built out in full; the sidebar's "Tax Settings" link points at the existing company rates form in `/settings` rather than a new page — flag if you want any of the others as real, separate pages.
