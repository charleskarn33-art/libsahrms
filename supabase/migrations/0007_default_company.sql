-- =====================================================================
-- LIBSA HRMS — Per-user default company
--
-- Lets a company's HR/Admin pin a "default company" on a user's profile
-- so that person lands straight in that company after login instead of
-- seeing the multi-company picker. The switcher/picker remain available
-- to override on demand.
-- =====================================================================

alter table profiles add column if not exists default_company_id uuid references companies(id) on delete set null;

-- Security-definer RPC rather than a broad profiles UPDATE policy: this
-- lets a company's HR/Admin set the default for *their own* team members
-- without granting them write access to arbitrary profile fields.
create or replace function set_default_company(p_profile_id uuid, p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_company_hr_or_admin(p_company_id) then
    raise exception 'Not authorized to manage this company''s team';
  end if;

  if not (
    exists (
      select 1 from company_memberships
      where profile_id = p_profile_id and company_id = p_company_id and is_active
    )
    or exists (
      select 1 from employees
      where profile_id = p_profile_id and company_id = p_company_id
    )
  ) then
    raise exception 'That user does not have access to this company';
  end if;

  update profiles set default_company_id = p_company_id where id = p_profile_id;
end;
$$;
