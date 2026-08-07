-- =====================================================================
-- LIBSA HRMS — Row Level Security
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (security definer so they can read profiles safely)
-- ---------------------------------------------------------------------

create or replace function current_profile_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_hr_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(current_profile_role() in ('super_admin', 'hr_manager'), false);
$$;

create or replace function is_payroll_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(current_profile_role() in (
    'super_admin', 'hr_manager', 'payroll_officer', 'finance_manager', 'managing_director'
  ), false);
$$;

create or replace function is_management()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(current_profile_role() in (
    'super_admin', 'hr_manager', 'finance_manager', 'managing_director', 'auditor'
  ), false);
$$;

create or replace function current_employee_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from employees where profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------

alter table company_settings enable row level security;
alter table departments enable row level security;
alter table positions enable row level security;
alter table profiles enable row level security;
alter table employees enable row level security;
alter table employee_documents enable row level security;
alter table attendance_records enable row level security;
alter table leave_balances enable row level security;
alter table leave_requests enable row level security;
alter table loans enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_items enable row level security;
alter table payroll_item_deductions enable row level security;
alter table payslips enable row level security;
alter table payslip_deliveries enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table announcements enable row level security;

-- ---------------------------------------------------------------------
-- company_settings / departments / positions / announcements: readable by all
-- authenticated users, writable by HR/Admin only
-- ---------------------------------------------------------------------

create policy "company_settings_read" on company_settings for select using (auth.role() = 'authenticated');
create policy "company_settings_write" on company_settings for all using (is_hr_or_admin()) with check (is_hr_or_admin());

create policy "departments_read" on departments for select using (auth.role() = 'authenticated');
create policy "departments_write" on departments for all using (is_hr_or_admin()) with check (is_hr_or_admin());

create policy "positions_read" on positions for select using (auth.role() = 'authenticated');
create policy "positions_write" on positions for all using (is_hr_or_admin()) with check (is_hr_or_admin());

create policy "announcements_read" on announcements for select using (auth.role() = 'authenticated');
create policy "announcements_write" on announcements for all using (is_hr_or_admin()) with check (is_hr_or_admin());

-- ---------------------------------------------------------------------
-- profiles: self read/update; HR/Admin read all
-- ---------------------------------------------------------------------

create policy "profiles_self_select" on profiles for select using (id = auth.uid() or is_management());
create policy "profiles_self_update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on profiles for all using (current_profile_role() = 'super_admin') with check (current_profile_role() = 'super_admin');

-- ---------------------------------------------------------------------
-- employees: HR/Admin/Payroll manage; employee reads own record
-- ---------------------------------------------------------------------

create policy "employees_self_select" on employees for select using (profile_id = auth.uid() or is_payroll_staff() or is_management());
create policy "employees_self_update_limited" on employees for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "employees_hr_write" on employees for insert with check (is_hr_or_admin());
create policy "employees_hr_update" on employees for update using (is_hr_or_admin()) with check (is_hr_or_admin());
create policy "employees_hr_delete" on employees for delete using (current_profile_role() = 'super_admin');

create policy "employee_documents_owner_select" on employee_documents for select
  using (exists (select 1 from employees e where e.id = employee_documents.employee_id and (e.profile_id = auth.uid())) or is_hr_or_admin());
create policy "employee_documents_hr_write" on employee_documents for all using (is_hr_or_admin()) with check (is_hr_or_admin());

-- ---------------------------------------------------------------------
-- attendance: employee manages own; HR/Admin manage all
-- ---------------------------------------------------------------------

create policy "attendance_self_select" on attendance_records for select
  using (employee_id = current_employee_id() or is_hr_or_admin() or is_management());
create policy "attendance_self_insert" on attendance_records for insert
  with check (employee_id = current_employee_id() or is_hr_or_admin());
create policy "attendance_self_update" on attendance_records for update
  using (employee_id = current_employee_id() or is_hr_or_admin())
  with check (employee_id = current_employee_id() or is_hr_or_admin());
create policy "attendance_hr_delete" on attendance_records for delete using (is_hr_or_admin());

-- ---------------------------------------------------------------------
-- leave
-- ---------------------------------------------------------------------

create policy "leave_balances_select" on leave_balances for select
  using (employee_id = current_employee_id() or is_hr_or_admin() or is_management());
create policy "leave_balances_hr_write" on leave_balances for all using (is_hr_or_admin()) with check (is_hr_or_admin());

create policy "leave_requests_select" on leave_requests for select
  using (employee_id = current_employee_id() or is_hr_or_admin() or is_management());
create policy "leave_requests_self_insert" on leave_requests for insert
  with check (employee_id = current_employee_id() or is_hr_or_admin());
create policy "leave_requests_review_update" on leave_requests for update
  using (is_hr_or_admin() or employee_id = current_employee_id())
  with check (is_hr_or_admin() or employee_id = current_employee_id());

-- ---------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------

create policy "loans_select" on loans for select
  using (employee_id = current_employee_id() or is_payroll_staff() or is_management());
create policy "loans_self_insert" on loans for insert
  with check (employee_id = current_employee_id() or is_hr_or_admin());
create policy "loans_payroll_write" on loans for update using (is_payroll_staff()) with check (is_payroll_staff());

-- ---------------------------------------------------------------------
-- payroll: only payroll staff/management can see period-wide data;
-- employees never see other employees' payroll_items
-- ---------------------------------------------------------------------

create policy "payroll_periods_select" on payroll_periods for select using (is_payroll_staff());
create policy "payroll_periods_write" on payroll_periods for all using (is_payroll_staff()) with check (is_payroll_staff());

create policy "payroll_items_staff_select" on payroll_items for select
  using (is_payroll_staff() or employee_id = current_employee_id());
create policy "payroll_items_write" on payroll_items for all using (is_payroll_staff()) with check (is_payroll_staff());

create policy "payroll_item_deductions_select" on payroll_item_deductions for select
  using (is_payroll_staff() or exists (
    select 1 from payroll_items pi where pi.id = payroll_item_deductions.payroll_item_id and pi.employee_id = current_employee_id()
  ));
create policy "payroll_item_deductions_write" on payroll_item_deductions for all using (is_payroll_staff()) with check (is_payroll_staff());

-- ---------------------------------------------------------------------
-- payslips: strictly own payslip only, unless payroll staff
-- ---------------------------------------------------------------------

create policy "payslips_self_select" on payslips for select
  using (employee_id = current_employee_id() or is_payroll_staff());
create policy "payslips_write" on payslips for all using (is_payroll_staff()) with check (is_payroll_staff());

create policy "payslip_deliveries_self_select" on payslip_deliveries for select
  using (employee_id = current_employee_id() or is_payroll_staff());
create policy "payslip_deliveries_write" on payslip_deliveries for all using (is_payroll_staff()) with check (is_payroll_staff());

-- ---------------------------------------------------------------------
-- notifications: self only
-- ---------------------------------------------------------------------

create policy "notifications_self_select" on notifications for select using (profile_id = auth.uid());
create policy "notifications_self_update" on notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "notifications_system_insert" on notifications for insert with check (true);

-- ---------------------------------------------------------------------
-- audit_logs: write by any authenticated action (via server), read by auditor/admin
-- ---------------------------------------------------------------------

create policy "audit_logs_select" on audit_logs for select using (is_management());
create policy "audit_logs_insert" on audit_logs for insert with check (auth.role() = 'authenticated');
