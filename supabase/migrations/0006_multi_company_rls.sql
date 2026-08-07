-- =====================================================================
-- LIBSA HRMS — Multi-company Row Level Security rewrite
--
-- Replaces the single-tenant helper functions/policies from 0003_rls.sql
-- with company-scoped equivalents. A profile with profiles.role =
-- 'super_admin' is a platform admin and bypasses per-company checks
-- everywhere; every other role requires an active company_memberships
-- row (or, for self-service, an employees row) for the specific company.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Drop the old single-tenant policies + helper functions
-- ---------------------------------------------------------------------

drop policy if exists "departments_read" on departments;
drop policy if exists "departments_write" on departments;
drop policy if exists "positions_read" on positions;
drop policy if exists "positions_write" on positions;
drop policy if exists "announcements_read" on announcements;
drop policy if exists "announcements_write" on announcements;
drop policy if exists "employees_self_select" on employees;
drop policy if exists "employees_self_update_limited" on employees;
drop policy if exists "employees_hr_write" on employees;
drop policy if exists "employees_hr_update" on employees;
drop policy if exists "employees_hr_delete" on employees;
drop policy if exists "employee_documents_owner_select" on employee_documents;
drop policy if exists "employee_documents_hr_write" on employee_documents;
drop policy if exists "attendance_self_select" on attendance_records;
drop policy if exists "attendance_self_insert" on attendance_records;
drop policy if exists "attendance_self_update" on attendance_records;
drop policy if exists "attendance_hr_delete" on attendance_records;
drop policy if exists "leave_balances_select" on leave_balances;
drop policy if exists "leave_balances_hr_write" on leave_balances;
drop policy if exists "leave_requests_select" on leave_requests;
drop policy if exists "leave_requests_self_insert" on leave_requests;
drop policy if exists "leave_requests_review_update" on leave_requests;
drop policy if exists "loans_select" on loans;
drop policy if exists "loans_self_insert" on loans;
drop policy if exists "loans_payroll_write" on loans;
drop policy if exists "payroll_periods_select" on payroll_periods;
drop policy if exists "payroll_periods_write" on payroll_periods;
drop policy if exists "payroll_items_staff_select" on payroll_items;
drop policy if exists "payroll_items_write" on payroll_items;
drop policy if exists "payroll_item_deductions_select" on payroll_item_deductions;
drop policy if exists "payroll_item_deductions_write" on payroll_item_deductions;
drop policy if exists "payslips_self_select" on payslips;
drop policy if exists "payslips_write" on payslips;
drop policy if exists "payslip_deliveries_self_select" on payslip_deliveries;
drop policy if exists "payslip_deliveries_write" on payslip_deliveries;
drop policy if exists "audit_logs_select" on audit_logs;
drop policy if exists "audit_logs_insert" on audit_logs;
drop policy if exists "profiles_self_select" on profiles;

drop policy if exists "company_assets_hr_write" on storage.objects;
drop policy if exists "employee_documents_hr_all" on storage.objects;
drop policy if exists "employee_documents_owner_read" on storage.objects;
drop policy if exists "payslips_payroll_staff_all" on storage.objects;
drop policy if exists "payslips_owner_read" on storage.objects;

drop function if exists is_hr_or_admin();
drop function if exists is_payroll_staff();
drop function if exists is_management();
drop function if exists current_employee_id();

-- ---------------------------------------------------------------------
-- New helper functions
-- ---------------------------------------------------------------------

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'super_admin', false);
$$;

create or replace function has_company_role(p_company_id uuid, p_roles user_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1 from company_memberships cm
    where cm.company_id = p_company_id
      and cm.profile_id = auth.uid()
      and cm.is_active
      and cm.role = any(p_roles)
  );
$$;

create or replace function is_company_member(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1 from company_memberships cm
    where cm.company_id = p_company_id and cm.profile_id = auth.uid() and cm.is_active
  ) or exists (
    select 1 from employees e where e.company_id = p_company_id and e.profile_id = auth.uid()
  );
$$;

create or replace function is_company_hr_or_admin(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select has_company_role(p_company_id, array['hr_manager']::user_role[]);
$$;

create or replace function is_company_payroll_staff(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select has_company_role(p_company_id, array['hr_manager', 'payroll_officer', 'finance_manager', 'managing_director']::user_role[]);
$$;

create or replace function is_company_management(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select has_company_role(p_company_id, array['hr_manager', 'finance_manager', 'managing_director', 'auditor']::user_role[]);
$$;

create or replace function is_own_employee(p_employee_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from employees where id = p_employee_id and profile_id = auth.uid());
$$;

-- Profiles are platform-wide (one login can staff several companies), so
-- visibility is scoped to "do we share a company" rather than a blanket
-- management bypass — otherwise an HR Manager at Company A could browse
-- every user profile at Company B.
create or replace function can_view_profile(p_target_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    p_target_profile_id = auth.uid()
    or is_platform_admin()
    or exists (
      select 1 from company_memberships cm
      where cm.profile_id = p_target_profile_id and is_company_hr_or_admin(cm.company_id)
    )
    or exists (
      select 1 from employees e
      where e.profile_id = p_target_profile_id and is_company_hr_or_admin(e.company_id)
    );
$$;

create policy "profiles_visible_select" on profiles for select using (can_view_profile(id));

-- ---------------------------------------------------------------------
-- companies / company_memberships
-- ---------------------------------------------------------------------

alter table companies enable row level security;
alter table company_memberships enable row level security;

create policy "companies_member_select" on companies for select
  using (is_company_member(id));
create policy "companies_platform_admin_write" on companies for all
  using (is_platform_admin()) with check (is_platform_admin());
create policy "companies_company_admin_update" on companies for update
  using (is_company_hr_or_admin(id)) with check (is_company_hr_or_admin(id));

create policy "company_memberships_select" on company_memberships for select
  using (profile_id = auth.uid() or is_company_hr_or_admin(company_id));
create policy "company_memberships_write" on company_memberships for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

-- ---------------------------------------------------------------------
-- departments / positions / announcements — readable by any company
-- member, writable by that company's HR/Admin
-- ---------------------------------------------------------------------

create policy "departments_read" on departments for select using (is_company_member(company_id));
create policy "departments_write" on departments for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "positions_read" on positions for select using (is_company_member(company_id));
create policy "positions_write" on positions for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "announcements_read" on announcements for select using (is_company_member(company_id));
create policy "announcements_write" on announcements for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

-- ---------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------

create policy "employees_self_select" on employees for select
  using (profile_id = auth.uid() or is_company_payroll_staff(company_id) or is_company_management(company_id));
create policy "employees_self_update_limited" on employees for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "employees_hr_write" on employees for insert with check (is_company_hr_or_admin(company_id));
create policy "employees_hr_update" on employees for update
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));
create policy "employees_hr_delete" on employees for delete using (is_platform_admin());

create policy "employee_documents_owner_select" on employee_documents for select
  using (is_own_employee(employee_id) or exists (
    select 1 from employees e where e.id = employee_documents.employee_id and is_company_hr_or_admin(e.company_id)
  ));
create policy "employee_documents_hr_write" on employee_documents for all
  using (exists (select 1 from employees e where e.id = employee_documents.employee_id and is_company_hr_or_admin(e.company_id)))
  with check (exists (select 1 from employees e where e.id = employee_documents.employee_id and is_company_hr_or_admin(e.company_id)));

-- ---------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------

create policy "attendance_self_select" on attendance_records for select
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id) or is_company_management(company_id));
create policy "attendance_self_insert" on attendance_records for insert
  with check (is_own_employee(employee_id) or is_company_hr_or_admin(company_id));
create policy "attendance_self_update" on attendance_records for update
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id))
  with check (is_own_employee(employee_id) or is_company_hr_or_admin(company_id));
create policy "attendance_hr_delete" on attendance_records for delete using (is_company_hr_or_admin(company_id));

-- ---------------------------------------------------------------------
-- leave
-- ---------------------------------------------------------------------

create policy "leave_balances_select" on leave_balances for select
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id) or is_company_management(company_id));
create policy "leave_balances_hr_write" on leave_balances for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));

create policy "leave_requests_select" on leave_requests for select
  using (is_own_employee(employee_id) or is_company_hr_or_admin(company_id) or is_company_management(company_id));
create policy "leave_requests_self_insert" on leave_requests for insert
  with check (is_own_employee(employee_id) or is_company_hr_or_admin(company_id));
create policy "leave_requests_review_update" on leave_requests for update
  using (is_company_hr_or_admin(company_id) or is_own_employee(employee_id))
  with check (is_company_hr_or_admin(company_id) or is_own_employee(employee_id));

-- ---------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------

create policy "loans_select" on loans for select
  using (is_own_employee(employee_id) or is_company_payroll_staff(company_id) or is_company_management(company_id));
create policy "loans_self_insert" on loans for insert
  with check (is_own_employee(employee_id) or is_company_hr_or_admin(company_id));
create policy "loans_payroll_write" on loans for update
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));

-- ---------------------------------------------------------------------
-- payroll
-- ---------------------------------------------------------------------

create policy "payroll_periods_select" on payroll_periods for select using (is_company_payroll_staff(company_id));
create policy "payroll_periods_write" on payroll_periods for all
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));

create policy "payroll_items_staff_select" on payroll_items for select
  using (is_company_payroll_staff(company_id) or is_own_employee(employee_id));
create policy "payroll_items_write" on payroll_items for all
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));

create policy "payroll_item_deductions_select" on payroll_item_deductions for select
  using (exists (
    select 1 from payroll_items pi where pi.id = payroll_item_deductions.payroll_item_id
      and (is_company_payroll_staff(pi.company_id) or is_own_employee(pi.employee_id))
  ));
create policy "payroll_item_deductions_write" on payroll_item_deductions for all
  using (exists (select 1 from payroll_items pi where pi.id = payroll_item_deductions.payroll_item_id and is_company_payroll_staff(pi.company_id)))
  with check (exists (select 1 from payroll_items pi where pi.id = payroll_item_deductions.payroll_item_id and is_company_payroll_staff(pi.company_id)));

-- ---------------------------------------------------------------------
-- payslips — strictly own payslip only, unless payroll staff of that company
-- ---------------------------------------------------------------------

create policy "payslips_self_select" on payslips for select
  using (is_own_employee(employee_id) or is_company_payroll_staff(company_id));
create policy "payslips_write" on payslips for all
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));

create policy "payslip_deliveries_self_select" on payslip_deliveries for select
  using (is_own_employee(employee_id) or is_company_payroll_staff(company_id));
create policy "payslip_deliveries_write" on payslip_deliveries for all
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));

-- ---------------------------------------------------------------------
-- audit_logs — company-scoped entries visible to that company's
-- management; platform-level entries (company_id null) visible to
-- platform admins only
-- ---------------------------------------------------------------------

create policy "audit_logs_select" on audit_logs for select
  using (
    (company_id is not null and is_company_management(company_id))
    or (company_id is null and is_platform_admin())
  );
create policy "audit_logs_insert" on audit_logs for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- storage.objects — company-aware equivalents of the 0004 policies.
-- employee-documents/payslips are stored as {employee_id}/{filename};
-- company scoping is resolved by joining that employee_id back to its
-- company.
-- ---------------------------------------------------------------------

create policy "company_assets_hr_write" on storage.objects for all
  using (bucket_id = 'company-assets' and is_company_hr_or_admin(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'company-assets' and is_company_hr_or_admin(((storage.foldername(name))[1])::uuid));

create policy "employee_documents_hr_all" on storage.objects for all
  using (
    bucket_id = 'employee-documents'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and is_company_hr_or_admin(e.company_id)
    )
  )
  with check (
    bucket_id = 'employee-documents'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and is_company_hr_or_admin(e.company_id)
    )
  );

create policy "employee_documents_owner_read" on storage.objects for select
  using (
    bucket_id = 'employee-documents'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and e.profile_id = auth.uid()
    )
  );

create policy "payslips_payroll_staff_all" on storage.objects for all
  using (
    bucket_id = 'payslips'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and is_company_payroll_staff(e.company_id)
    )
  )
  with check (
    bucket_id = 'payslips'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and is_company_payroll_staff(e.company_id)
    )
  );

create policy "payslips_owner_read" on storage.objects for select
  using (
    bucket_id = 'payslips'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and e.profile_id = auth.uid()
    )
  );
