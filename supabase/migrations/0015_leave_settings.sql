-- =====================================================================
-- LIBSA HRMS — Leave settings: company-level leave type defaults & policy
--
-- leave_balances already stores per-employee, per-type entitlements;
-- this adds the company-level defaults an HR admin edits once instead
-- of touching every employee's balance row. leave_type stays the fixed
-- enum from 0001 — these tables hold per-company *metadata* for each
-- enum value, not a user-defined type list.
-- =====================================================================

create table leave_type_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  leave_type leave_type not null,
  default_days numeric(5,2) not null default 0,
  max_carry_forward_days numeric(5,2) not null default 0,
  is_paid boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, leave_type)
);

create table leave_policies (
  company_id uuid primary key references companies(id) on delete cascade,
  leave_year_start_month int not null default 1 check (leave_year_start_month between 1 and 12),
  probation_period_days int not null default 90,
  min_service_months int not null default 0,
  max_consecutive_leave_days int not null default 30,
  approval_lead_days int not null default 0,
  allow_half_day boolean not null default true,
  allow_backdated boolean not null default false,
  carry_forward_enabled boolean not null default true,
  encashment_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index idx_leave_type_settings_company on leave_type_settings(company_id);

alter table leave_type_settings enable row level security;
alter table leave_policies enable row level security;

create policy "leave_type_settings_read" on leave_type_settings for select using (is_company_member(company_id));
create policy "leave_type_settings_write" on leave_type_settings for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "leave_policies_read" on leave_policies for select using (is_company_member(company_id));
create policy "leave_policies_write" on leave_policies for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));
