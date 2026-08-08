-- ---------------------------------------------------------------------
-- BENEFITS ADMINISTRATION
--
-- benefit_providers  — insurers / administrators (Jubilee Health, NASSCORP, ...)
-- benefit_plans      — the catalog of plans a company offers, with the
--                      plan's annual company/employee contribution budget
-- benefit_enrollments — which employees are enrolled in which plan
-- benefit_dependents  — dependents covered under a specific enrollment
-- benefit_claims      — claims filed against a plan
-- ---------------------------------------------------------------------

create table benefit_providers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table benefit_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  provider_id uuid references benefit_providers(id) on delete set null,
  name text not null,
  category text not null check (category in ('health', 'dental', 'vision', 'life', 'retirement', 'wellness', 'other')),
  description text,
  -- Annual budget for the plan as a whole, not a per-employee rate — this is
  -- what's edited when setting up a plan and what the Overview totals sum.
  company_contribution numeric(12,2) not null default 0,
  employee_contribution numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table benefit_enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  benefit_plan_id uuid not null references benefit_plans(id) on delete cascade,
  enrollment_date date not null default current_date,
  coverage_start_date date,
  status text not null default 'active' check (status in ('active', 'pending', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table benefit_dependents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references benefit_enrollments(id) on delete cascade,
  full_name text not null,
  relationship text not null check (relationship in ('spouse', 'child', 'other')),
  date_of_birth date,
  created_at timestamptz not null default now()
);

create table benefit_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  benefit_plan_id uuid not null references benefit_plans(id) on delete restrict,
  claim_number text not null,
  description text,
  amount_claimed numeric(12,2) not null,
  amount_approved numeric(12,2),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, claim_number)
);

create index idx_benefit_plans_company on benefit_plans(company_id);
create index idx_benefit_enrollments_company on benefit_enrollments(company_id);
create index idx_benefit_enrollments_employee on benefit_enrollments(employee_id);
create index idx_benefit_enrollments_plan on benefit_enrollments(benefit_plan_id);
create index idx_benefit_dependents_enrollment on benefit_dependents(enrollment_id);
create index idx_benefit_claims_company on benefit_claims(company_id);
create index idx_benefit_claims_employee on benefit_claims(employee_id);

do $$
declare
  t text;
begin
  foreach t in array array['benefit_providers', 'benefit_plans', 'benefit_enrollments', 'benefit_claims']
  loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table benefit_providers enable row level security;
alter table benefit_plans enable row level security;
alter table benefit_enrollments enable row level security;
alter table benefit_dependents enable row level security;
alter table benefit_claims enable row level security;

create policy "benefit_providers_select" on benefit_providers for select using (is_company_member(company_id));
create policy "benefit_providers_hr_write" on benefit_providers for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "benefit_plans_select" on benefit_plans for select using (is_company_member(company_id));
create policy "benefit_plans_hr_write" on benefit_plans for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "benefit_enrollments_select" on benefit_enrollments for select
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id) or is_company_management(company_id));
create policy "benefit_enrollments_hr_write" on benefit_enrollments for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "benefit_dependents_select" on benefit_dependents for select
  using (exists (
    select 1 from benefit_enrollments be
    where be.id = benefit_dependents.enrollment_id
      and (is_own_employee(be.employee_id) or is_company_hr_or_admin(be.company_id) or is_company_management(be.company_id))
  ));
create policy "benefit_dependents_hr_write" on benefit_dependents for all
  using (exists (select 1 from benefit_enrollments be where be.id = benefit_dependents.enrollment_id and is_company_hr_or_admin(be.company_id)))
  with check (exists (select 1 from benefit_enrollments be where be.id = benefit_dependents.enrollment_id and is_company_hr_or_admin(be.company_id)));

create policy "benefit_claims_select" on benefit_claims for select
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id) or is_company_management(company_id));
create policy "benefit_claims_self_insert" on benefit_claims for insert
  with check (is_own_employee(employee_id) or is_company_hr_or_admin(company_id));
create policy "benefit_claims_hr_update" on benefit_claims for update
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));
