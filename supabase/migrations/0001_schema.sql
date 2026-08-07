-- =====================================================================
-- LIBSA HRMS — Core Schema
-- Phase 1: extensions, enums, tables, indexes, constraints, triggers
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

create type user_role as enum (
  'super_admin',
  'hr_manager',
  'payroll_officer',
  'finance_manager',
  'managing_director',
  'employee',
  'auditor'
);

create type employment_type as enum ('full_time', 'part_time', 'contract', 'intern', 'temporary');
create type employment_status as enum ('active', 'on_leave', 'suspended', 'terminated', 'resigned', 'retired');
create type marital_status as enum ('single', 'married', 'divorced', 'widowed');
create type gender_type as enum ('male', 'female', 'other');
create type tax_status as enum ('single', 'married', 'exempt');

create type attendance_status as enum ('present', 'late', 'early_leave', 'absent', 'holiday', 'weekend', 'on_leave');

create type leave_type as enum (
  'annual', 'sick', 'compassionate', 'maternity', 'paternity', 'emergency', 'unpaid'
);
create type leave_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create type payroll_frequency as enum ('monthly', 'biweekly', 'weekly');
create type payroll_status as enum ('draft', 'pending', 'approved', 'locked', 'paid', 'cancelled');
create type payroll_approval_stage as enum (
  'hr_preparation', 'finance_review', 'director_approval', 'payroll_locked', 'payslips_sent'
);
create type approval_decision as enum ('pending', 'approved', 'rejected');

create type loan_status as enum ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled');

create type payslip_delivery_status as enum ('queued', 'sent', 'delivered', 'opened', 'failed');

create type notification_channel as enum ('in_app', 'email');
create type notification_type as enum (
  'payroll_ready', 'leave_approved', 'leave_rejected', 'payslip_sent',
  'birthday_reminder', 'contract_expiring', 'general'
);

-- ---------------------------------------------------------------------
-- COMPANY / ORG STRUCTURE
-- ---------------------------------------------------------------------

create table company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'LIBSA Consultancy',
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  description text,
  head_employee_id uuid, -- FK added after employees table exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department_id uuid references departments(id) on delete set null,
  salary_grade text,
  min_salary numeric(12,2),
  max_salary numeric(12,2),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title, department_id)
);

-- ---------------------------------------------------------------------
-- USERS (mirrors auth.users) & EMPLOYEES
-- ---------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'employee',
  avatar_url text,
  is_active boolean not null default true,
  two_factor_enabled boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  employee_number text not null unique,

  first_name text not null,
  middle_name text,
  last_name text not null,
  photo_url text,

  gender gender_type,
  date_of_birth date,
  marital_status marital_status,
  nationality text,
  county text,
  district text,
  address text,

  phone text,
  email text unique,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  department_id uuid references departments(id) on delete set null,
  position_id uuid references positions(id) on delete set null,
  supervisor_id uuid references employees(id) on delete set null,

  employment_type employment_type not null default 'full_time',
  employment_status employment_status not null default 'active',
  date_hired date not null default current_date,
  date_terminated date,

  salary_grade text,
  basic_salary numeric(12,2) not null default 0,
  transport_allowance numeric(12,2) not null default 0,
  housing_allowance numeric(12,2) not null default 0,
  relocation_allowance numeric(12,2) not null default 0,
  standard_bonus numeric(12,2) not null default 0,
  standard_commission numeric(12,2) not null default 0,

  bank_name text,
  bank_account_number text,
  orange_money_number text,
  payment_method text not null default 'bank' check (payment_method in ('bank', 'orange_money', 'cash')),

  tin text,
  nasscorp_number text,
  tax_status tax_status not null default 'single',

  medical_information text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_basic_salary_nonneg check (basic_salary >= 0)
);

alter table departments
  add constraint fk_departments_head
  foreign key (head_employee_id) references employees(id) on delete set null;

create table employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type text not null check (document_type in ('contract', 'cv', 'certificate', 'id', 'other')),
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  clock_in_lat numeric(9,6),
  clock_in_lng numeric(9,6),
  clock_out_lat numeric(9,6),
  clock_out_lng numeric(9,6),
  status attendance_status not null default 'present',
  overtime_hours numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

-- ---------------------------------------------------------------------
-- LEAVE
-- ---------------------------------------------------------------------

create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type leave_type not null,
  year int not null,
  entitled_days numeric(5,2) not null default 0,
  used_days numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type, year)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  days_requested numeric(5,2) not null,
  reason text,
  status leave_request_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_leave_dates check (end_date >= start_date)
);

-- ---------------------------------------------------------------------
-- LOANS & ADVANCES
-- ---------------------------------------------------------------------

create table loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  loan_type text not null default 'loan' check (loan_type in ('loan', 'salary_advance')),
  principal_amount numeric(12,2) not null,
  monthly_deduction numeric(12,2) not null,
  balance_remaining numeric(12,2) not null,
  status loan_status not null default 'pending',
  requested_at timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_loan_amounts check (principal_amount > 0 and monthly_deduction > 0)
);

-- ---------------------------------------------------------------------
-- PAYROLL
-- ---------------------------------------------------------------------

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  frequency payroll_frequency not null default 'monthly',
  period_start date not null,
  period_end date not null,
  payment_date date,
  status payroll_status not null default 'draft',
  approval_stage payroll_approval_stage not null default 'hr_preparation',
  hr_prepared_by uuid references profiles(id) on delete set null,
  hr_prepared_at timestamptz,
  finance_reviewed_by uuid references profiles(id) on delete set null,
  finance_reviewed_at timestamptz,
  finance_decision approval_decision not null default 'pending',
  director_approved_by uuid references profiles(id) on delete set null,
  director_approved_at timestamptz,
  director_decision approval_decision not null default 'pending',
  locked_by uuid references profiles(id) on delete set null,
  locked_at timestamptz,
  unlocked_by uuid references profiles(id) on delete set null,
  unlocked_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, period_end, frequency)
);

create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,

  basic_salary numeric(12,2) not null default 0,
  housing_allowance numeric(12,2) not null default 0,
  transport_allowance numeric(12,2) not null default 0,
  relocation_allowance numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  overtime_hours numeric(6,2) not null default 0,
  overtime_rate numeric(12,2) not null default 0,
  overtime_pay numeric(12,2) not null default 0,

  gross_salary numeric(12,2) not null default 0,
  taxable_salary numeric(12,2) not null default 0,

  employee_nasscorp numeric(12,2) not null default 0,
  employer_nasscorp numeric(12,2) not null default 0,
  income_tax numeric(12,2) not null default 0,

  loan_deductions numeric(12,2) not null default 0,
  salary_advance_deductions numeric(12,2) not null default 0,
  other_deductions numeric(12,2) not null default 0,
  orange_money_fee numeric(12,2) not null default 0,

  total_deductions numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,

  payment_method text not null default 'bank',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, employee_id)
);

create table payroll_item_deductions (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  loan_id uuid references loans(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PAYSLIPS
-- ---------------------------------------------------------------------

create table payslips (
  id uuid primary key default gen_random_uuid(),
  payslip_number text not null unique,
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  storage_path text,
  qr_code_data text,
  generated_at timestamptz not null default now(),
  generated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table payslip_deliveries (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references payslips(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  recipient_email text not null,
  status payslip_delivery_status not null default 'queued',
  provider_message_id text,
  error_message text,
  attempt_count int not null default 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null default 'general',
  channel notification_channel not null default 'in_app',
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  icon text default 'info',
  created_by uuid references profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------

create index idx_employees_department on employees(department_id);
create index idx_employees_position on employees(position_id);
create index idx_employees_supervisor on employees(supervisor_id);
create index idx_employees_status on employees(employment_status);
create index idx_employees_name_trgm on employees using gin ((first_name || ' ' || last_name) gin_trgm_ops);

create index idx_attendance_employee_date on attendance_records(employee_id, work_date desc);
create index idx_leave_requests_employee on leave_requests(employee_id);
create index idx_leave_requests_status on leave_requests(status);

create index idx_loans_employee on loans(employee_id);
create index idx_loans_status on loans(status);

create index idx_payroll_items_period on payroll_items(payroll_period_id);
create index idx_payroll_items_employee on payroll_items(employee_id);

create index idx_payslips_employee on payslips(employee_id);
create index idx_payslip_deliveries_status on payslip_deliveries(status);

create index idx_notifications_profile_unread on notifications(profile_id, is_read);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_created on audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- updated_at TRIGGER FUNCTION
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'company_settings', 'departments', 'positions', 'profiles', 'employees',
    'attendance_records', 'leave_balances', 'leave_requests', 'loans',
    'payroll_periods', 'payroll_items', 'payslip_deliveries'
  ]
  loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- new-user -> profile bootstrap
-- ---------------------------------------------------------------------

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
