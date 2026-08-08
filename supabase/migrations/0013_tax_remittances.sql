-- ---------------------------------------------------------------------
-- TAX & NASSCORP REMITTANCE TRACKING
--
-- Records that WHT + NASSCORP contributions for a payroll period have
-- actually been paid over to the government, with a receipt reference
-- for audit purposes. Amounts are not duplicated here — they're derived
-- live from payroll_items/v_payroll_period_summary at query time — this
-- table only tracks the fact and evidence of remittance.
-- ---------------------------------------------------------------------

create table tax_remittances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  status text not null default 'paid' check (status in ('pending', 'paid')),
  payment_date date not null default current_date,
  receipt_reference text,
  notes text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, payroll_period_id)
);

create index idx_tax_remittances_company on tax_remittances(company_id);

create trigger trg_set_updated_at before update on tax_remittances
  for each row execute function set_updated_at();

alter table tax_remittances enable row level security;

create policy "tax_remittances_select" on tax_remittances for select
  using (is_company_management(company_id));
create policy "tax_remittances_payroll_insert" on tax_remittances for insert
  with check (is_company_payroll_staff(company_id));
create policy "tax_remittances_payroll_update" on tax_remittances for update
  using (is_company_payroll_staff(company_id)) with check (is_company_payroll_staff(company_id));
create policy "tax_remittances_payroll_delete" on tax_remittances for delete
  using (is_company_payroll_staff(company_id));
