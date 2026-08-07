-- =====================================================================
-- LIBSA HRMS — Multi-company support
--
-- LIBSA Consultancy provides HR/payroll as a service to multiple client
-- companies. Each company's data is isolated; LIBSA staff (and any user)
-- can hold a scoped role in more than one company via company_memberships.
-- Regular employees belong to exactly one company via employees.company_id.
-- =====================================================================

-- ---------------------------------------------------------------------
-- companies (replaces the single-row company_settings)
-- ---------------------------------------------------------------------

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  address text,
  phone text,
  email text,
  tin text,
  nasscorp_employer_number text,
  employee_nasscorp_rate numeric(5,2) not null default 4.00,
  employer_nasscorp_rate numeric(5,2) not null default 6.00,
  income_tax_bands jsonb not null default '[]'::jsonb,
  payroll_frequency payroll_frequency not null default 'monthly',
  currency text not null default 'LRD',
  orange_money_fee_flat numeric(10,2) not null default 0,
  orange_money_fee_percent numeric(5,2) not null default 0,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_updated_at before update on companies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- company_memberships — scoped role grants; a profile with role
-- 'super_admin' on the profiles table bypasses this and sees every company
-- ---------------------------------------------------------------------

create table company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null,
  is_active boolean not null default true,
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create trigger trg_set_updated_at before update on company_memberships
  for each row execute function set_updated_at();

create index idx_company_memberships_profile on company_memberships(profile_id);
create index idx_company_memberships_company on company_memberships(company_id);

-- ---------------------------------------------------------------------
-- Seed a default company from any existing company_settings row so
-- pre-existing data (departments, positions, employees, announcements)
-- has somewhere to backfill company_id into.
-- ---------------------------------------------------------------------

do $$
declare
  v_company_id uuid;
  v_settings record;
begin
  select * into v_settings from company_settings limit 1;

  if v_settings is null then
    insert into companies (name, slug)
    values ('LIBSA Consultancy', 'libsa-consultancy')
    returning id into v_company_id;
  else
    insert into companies (
      name, slug, logo_url, address, phone, email, tin, nasscorp_employer_number,
      employee_nasscorp_rate, employer_nasscorp_rate, income_tax_bands,
      payroll_frequency, currency, orange_money_fee_flat, orange_money_fee_percent
    )
    values (
      coalesce(v_settings.company_name, 'LIBSA Consultancy'),
      'libsa-consultancy',
      v_settings.logo_url, v_settings.address, v_settings.phone, v_settings.email,
      v_settings.tin, v_settings.nasscorp_employer_number,
      v_settings.employee_nasscorp_rate, v_settings.employer_nasscorp_rate, v_settings.income_tax_bands,
      v_settings.payroll_frequency, v_settings.currency,
      v_settings.orange_money_fee_flat, v_settings.orange_money_fee_percent
    )
    returning id into v_company_id;
  end if;

  -- add company_id columns (nullable for now) and backfill existing rows
  alter table departments add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table positions add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table employees add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table attendance_records add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table leave_balances add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table leave_requests add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table loans add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table payroll_periods add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table payroll_items add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table payslips add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table payslip_deliveries add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table announcements add column if not exists company_id uuid references companies(id) on delete cascade;
  alter table audit_logs add column if not exists company_id uuid references companies(id) on delete set null;

  update departments set company_id = v_company_id where company_id is null;
  update positions set company_id = v_company_id where company_id is null;
  update employees set company_id = v_company_id where company_id is null;
  update attendance_records ar set company_id = v_company_id where company_id is null;
  update leave_balances set company_id = v_company_id where company_id is null;
  update leave_requests set company_id = v_company_id where company_id is null;
  update loans set company_id = v_company_id where company_id is null;
  update payroll_periods set company_id = v_company_id where company_id is null;
  update payroll_items set company_id = v_company_id where company_id is null;
  update payslips set company_id = v_company_id where company_id is null;
  update payslip_deliveries set company_id = v_company_id where company_id is null;
  update announcements set company_id = v_company_id where company_id is null;

  -- grant every existing super_admin/hr_manager profile a membership on the default company
  insert into company_memberships (company_id, profile_id, role)
  select v_company_id, p.id, p.role
  from profiles p
  where p.role in ('super_admin', 'hr_manager', 'payroll_officer', 'finance_manager', 'managing_director', 'auditor')
  on conflict (company_id, profile_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- Make the newly-backfilled columns mandatory (except audit_logs, which
-- may legitimately have platform-level entries with no company)
-- ---------------------------------------------------------------------

alter table departments alter column company_id set not null;
alter table positions alter column company_id set not null;
alter table employees alter column company_id set not null;
alter table attendance_records alter column company_id set not null;
alter table leave_balances alter column company_id set not null;
alter table leave_requests alter column company_id set not null;
alter table loans alter column company_id set not null;
alter table payroll_periods alter column company_id set not null;
alter table payroll_items alter column company_id set not null;
alter table payslips alter column company_id set not null;
alter table payslip_deliveries alter column company_id set not null;
alter table announcements alter column company_id set not null;

-- ---------------------------------------------------------------------
-- Re-scope uniqueness / lookups to be per-company instead of global
-- ---------------------------------------------------------------------

alter table departments drop constraint if exists departments_name_key;
alter table departments add constraint departments_company_name_key unique (company_id, name);

alter table positions drop constraint if exists positions_title_department_id_key;
alter table positions add constraint positions_company_title_department_key unique (company_id, title, department_id);

alter table employees drop constraint if exists employees_employee_number_key;
alter table employees add constraint employees_company_employee_number_key unique (company_id, employee_number);

alter table employees drop constraint if exists employees_profile_id_key;
alter table employees add constraint employees_company_profile_key unique (company_id, profile_id);

alter table payroll_periods drop constraint if exists payroll_periods_period_start_period_end_frequency_key;
alter table payroll_periods add constraint payroll_periods_company_period_key unique (company_id, period_start, period_end, frequency);

create index idx_departments_company on departments(company_id);
create index idx_positions_company on positions(company_id);
create index idx_employees_company on employees(company_id);
create index idx_attendance_company on attendance_records(company_id);
create index idx_leave_requests_company on leave_requests(company_id);
create index idx_loans_company on loans(company_id);
create index idx_payroll_periods_company on payroll_periods(company_id);
create index idx_payroll_items_company on payroll_items(company_id);
create index idx_payslips_company on payslips(company_id);
create index idx_announcements_company on announcements(company_id);
create index idx_audit_logs_company on audit_logs(company_id);

-- company_settings is superseded by companies
drop table if exists company_settings;

-- ---------------------------------------------------------------------
-- Re-scope the payroll calculation engine to a specific company.
-- calculate_income_tax gains a p_company_id parameter, which changes its
-- signature — drop the old single-arg overload so it doesn't linger as
-- dead code pointing at the now-dropped company_settings table.
-- ---------------------------------------------------------------------

drop function if exists calculate_income_tax(numeric);

create or replace function calculate_income_tax(p_taxable_salary numeric, p_company_id uuid)
returns numeric
language plpgsql
stable
as $$
declare
  bands jsonb;
  band jsonb;
  lower_bound numeric := 0;
  upper_bound numeric;
  rate numeric;
  remaining numeric := p_taxable_salary;
  tax numeric := 0;
  band_amount numeric;
begin
  select income_tax_bands into bands from companies where id = p_company_id;

  if bands is null or jsonb_array_length(bands) = 0 then
    return round(p_taxable_salary * 0.15, 2);
  end if;

  for band in select * from jsonb_array_elements(bands)
  loop
    upper_bound := (band->>'upTo')::numeric;
    rate := (band->>'rate')::numeric;

    if upper_bound is null then
      band_amount := remaining;
    else
      band_amount := least(remaining, greatest(upper_bound - lower_bound, 0));
    end if;

    if band_amount > 0 then
      tax := tax + (band_amount * rate / 100.0);
      remaining := remaining - band_amount;
    end if;

    lower_bound := upper_bound;
    exit when remaining <= 0 or upper_bound is null;
  end loop;

  return round(greatest(tax, 0), 2);
end;
$$;

create or replace function compute_payroll_item(
  p_employee_id uuid,
  p_overtime_hours numeric default 0,
  p_overtime_rate numeric default 0,
  p_extra_bonus numeric default 0,
  p_extra_commission numeric default 0,
  p_other_deductions numeric default 0
)
returns table (
  basic_salary numeric,
  housing_allowance numeric,
  transport_allowance numeric,
  relocation_allowance numeric,
  bonus numeric,
  commission numeric,
  overtime_pay numeric,
  gross_salary numeric,
  taxable_salary numeric,
  employee_nasscorp numeric,
  employer_nasscorp numeric,
  income_tax numeric,
  loan_deductions numeric,
  orange_money_fee numeric,
  total_deductions numeric,
  net_salary numeric
)
language plpgsql
stable
as $$
declare
  emp employees%rowtype;
  co companies%rowtype;
  v_overtime_pay numeric;
  v_gross numeric;
  v_taxable numeric;
  v_employee_nasscorp numeric;
  v_employer_nasscorp numeric;
  v_income_tax numeric;
  v_loan_deductions numeric;
  v_om_fee numeric;
  v_total_deductions numeric;
  v_net numeric;
begin
  select * into emp from employees where id = p_employee_id;
  select * into co from companies where id = emp.company_id;

  v_overtime_pay := round(p_overtime_hours * p_overtime_rate, 2);

  v_gross := emp.basic_salary
    + emp.housing_allowance
    + emp.transport_allowance
    + emp.relocation_allowance
    + emp.standard_bonus + p_extra_bonus
    + emp.standard_commission + p_extra_commission
    + v_overtime_pay;

  v_taxable := v_gross - emp.transport_allowance - emp.relocation_allowance;

  v_employee_nasscorp := round(v_gross * coalesce(co.employee_nasscorp_rate, 4) / 100.0, 2);
  v_employer_nasscorp := round(v_gross * coalesce(co.employer_nasscorp_rate, 6) / 100.0, 2);

  v_income_tax := calculate_income_tax(v_taxable - v_employee_nasscorp, emp.company_id);

  select coalesce(sum(monthly_deduction), 0) into v_loan_deductions
  from loans
  where employee_id = p_employee_id and status = 'active' and balance_remaining > 0;

  v_om_fee := case when emp.payment_method = 'orange_money'
    then round(coalesce(co.orange_money_fee_flat, 0) + (v_gross * coalesce(co.orange_money_fee_percent, 0) / 100.0), 2)
    else 0 end;

  v_total_deductions := v_employee_nasscorp + v_income_tax + v_loan_deductions + p_other_deductions + v_om_fee;
  v_net := v_gross - v_total_deductions;

  return query select
    emp.basic_salary, emp.housing_allowance, emp.transport_allowance, emp.relocation_allowance,
    emp.standard_bonus + p_extra_bonus, emp.standard_commission + p_extra_commission, v_overtime_pay,
    v_gross, v_taxable, v_employee_nasscorp, v_employer_nasscorp, v_income_tax,
    v_loan_deductions, v_om_fee, v_total_deductions, v_net;
end;
$$;

create or replace function generate_payroll_items(p_payroll_period_id uuid)
returns int
language plpgsql
as $$
declare
  v_company_id uuid;
  emp_record record;
  calc record;
  inserted_count int := 0;
begin
  select company_id into v_company_id from payroll_periods where id = p_payroll_period_id;

  for emp_record in
    select id, payment_method from employees where employment_status = 'active' and company_id = v_company_id
  loop
    select * into calc from compute_payroll_item(emp_record.id);

    insert into payroll_items (
      payroll_period_id, employee_id, company_id,
      basic_salary, housing_allowance, transport_allowance, relocation_allowance,
      bonus, commission, overtime_pay,
      gross_salary, taxable_salary,
      employee_nasscorp, employer_nasscorp, income_tax,
      loan_deductions, orange_money_fee, total_deductions, net_salary,
      payment_method
    ) values (
      p_payroll_period_id, emp_record.id, v_company_id,
      calc.basic_salary, calc.housing_allowance, calc.transport_allowance, calc.relocation_allowance,
      calc.bonus, calc.commission, calc.overtime_pay,
      calc.gross_salary, calc.taxable_salary,
      calc.employee_nasscorp, calc.employer_nasscorp, calc.income_tax,
      calc.loan_deductions, calc.orange_money_fee, calc.total_deductions, calc.net_salary,
      emp_record.payment_method
    )
    on conflict (payroll_period_id, employee_id) do nothing;

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Re-scope views to carry company_id so the app can filter per company
-- ---------------------------------------------------------------------

-- NOTE: CREATE OR REPLACE VIEW cannot reorder or rename pre-existing output
-- columns from the 0002 definitions — company_id is appended at the end of
-- each column list rather than inserted alongside its "natural" position.

create or replace view v_employee_directory as
select
  e.id, e.employee_number, e.first_name, e.middle_name, e.last_name,
  e.first_name || ' ' || coalesce(e.middle_name || ' ', '') || e.last_name as full_name,
  e.photo_url, e.email, e.phone, e.employment_status, e.employment_type, e.date_hired,
  d.name as department_name, p.title as position_title,
  s.first_name || ' ' || s.last_name as supervisor_name,
  e.company_id
from employees e
left join departments d on d.id = e.department_id
left join positions p on p.id = e.position_id
left join employees s on s.id = e.supervisor_id;

create or replace view v_payroll_period_summary as
select
  pp.id as payroll_period_id,
  pp.period_label,
  pp.status,
  pp.approval_stage,
  count(pi.id) as employee_count,
  coalesce(sum(pi.gross_salary), 0) as total_gross,
  coalesce(sum(pi.net_salary), 0) as total_net,
  coalesce(sum(pi.employee_nasscorp), 0) as total_employee_nasscorp,
  coalesce(sum(pi.employer_nasscorp), 0) as total_employer_nasscorp,
  coalesce(sum(pi.income_tax), 0) as total_income_tax,
  pp.company_id
from payroll_periods pp
left join payroll_items pi on pi.payroll_period_id = pp.id
group by pp.id;

create or replace view v_department_headcount as
select d.id as department_id, d.name as department_name,
  count(e.id) filter (where e.employment_status = 'active') as active_headcount,
  coalesce(sum(e.basic_salary) filter (where e.employment_status = 'active'), 0) as total_basic_salary,
  d.company_id
from departments d
left join employees e on e.department_id = d.id
group by d.id;

create or replace view v_leave_balance_summary as
select
  lb.employee_id,
  lb.leave_type,
  lb.year,
  lb.entitled_days,
  lb.used_days,
  (lb.entitled_days - lb.used_days) as remaining_days,
  lb.company_id
from leave_balances lb;

-- ---------------------------------------------------------------------
-- List of companies (and the caller's role in each) for the switcher UI
-- ---------------------------------------------------------------------

create or replace view v_my_companies as
select c.id as company_id, c.name, c.slug, c.logo_url,
  coalesce(cm.role, p.role) as role,
  (p.role = 'super_admin') as is_platform_admin
from companies c
cross join profiles p
left join company_memberships cm on cm.company_id = c.id and cm.profile_id = p.id and cm.is_active
where p.id = auth.uid()
  and (cm.id is not null or p.role = 'super_admin' or exists (
    select 1 from employees e where e.company_id = c.id and e.profile_id = p.id
  ))
  and c.is_active;
