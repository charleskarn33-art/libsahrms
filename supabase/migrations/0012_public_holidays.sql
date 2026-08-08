-- =====================================================================
-- LIBSA HRMS — Public holidays
--
-- Backs the "Public Holidays" page and feeds the leave calendar. Company
-- scoped like everything else, since different clients observe
-- different holiday calendars.
-- =====================================================================

create table public_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, holiday_date)
);

create index idx_public_holidays_company_date on public_holidays(company_id, holiday_date);

alter table public_holidays enable row level security;

create policy "public_holidays_read" on public_holidays for select using (is_company_member(company_id));
create policy "public_holidays_write" on public_holidays for all
  using (is_company_hr_or_admin(company_id)) with check (is_company_hr_or_admin(company_id));
