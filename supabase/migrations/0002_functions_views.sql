-- =====================================================================
-- LIBSA HRMS — Functions & Views
-- =====================================================================

-- ---------------------------------------------------------------------
-- Progressive income tax calculator, driven by company_settings.income_tax_bands
-- Bands shape: [{"upTo": 10000, "rate": 0}, {"upTo": 100000, "rate": 5}, {"upTo": null, "rate": 15}]
-- ---------------------------------------------------------------------

create or replace function calculate_income_tax(p_taxable_salary numeric)
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
  select income_tax_bands into bands from company_settings limit 1;

  if bands is null or jsonb_array_length(bands) = 0 then
    -- fallback flat 15% if no bands configured
    return round(p_taxable_salary * 0.15, 2);
  end if;

  for band in select * from jsonb_array_elements(bands)
  loop
    upper_bound := (band->>'upTo')::numeric; -- null = no upper bound
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

-- ---------------------------------------------------------------------
-- Compute (not persist) a full payroll item breakdown for one employee.
-- Used by the payroll engine when generating a payroll_items row.
-- ---------------------------------------------------------------------

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
  cs company_settings%rowtype;
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
  select * into cs from company_settings limit 1;

  v_overtime_pay := round(p_overtime_hours * p_overtime_rate, 2);

  v_gross := emp.basic_salary
    + emp.housing_allowance
    + emp.transport_allowance
    + emp.relocation_allowance
    + emp.standard_bonus + p_extra_bonus
    + emp.standard_commission + p_extra_commission
    + v_overtime_pay;

  -- Taxable salary excludes transport & relocation (statutory-style exemption)
  v_taxable := v_gross - emp.transport_allowance - emp.relocation_allowance;

  v_employee_nasscorp := round(v_gross * coalesce(cs.employee_nasscorp_rate, 4) / 100.0, 2);
  v_employer_nasscorp := round(v_gross * coalesce(cs.employer_nasscorp_rate, 6) / 100.0, 2);

  v_income_tax := calculate_income_tax(v_taxable - v_employee_nasscorp);

  select coalesce(sum(monthly_deduction), 0) into v_loan_deductions
  from loans
  where employee_id = p_employee_id and status = 'active' and balance_remaining > 0;

  v_om_fee := case when emp.payment_method = 'orange_money'
    then round(coalesce(cs.orange_money_fee_flat, 0) + (v_gross * coalesce(cs.orange_money_fee_percent, 0) / 100.0), 2)
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

-- ---------------------------------------------------------------------
-- Generate draft payroll_items for every active employee in a period
-- ---------------------------------------------------------------------

create or replace function generate_payroll_items(p_payroll_period_id uuid)
returns int
language plpgsql
as $$
declare
  emp_record record;
  calc record;
  inserted_count int := 0;
begin
  for emp_record in
    select id, payment_method from employees where employment_status = 'active'
  loop
    select * into calc from compute_payroll_item(emp_record.id);

    insert into payroll_items (
      payroll_period_id, employee_id,
      basic_salary, housing_allowance, transport_allowance, relocation_allowance,
      bonus, commission, overtime_pay,
      gross_salary, taxable_salary,
      employee_nasscorp, employer_nasscorp, income_tax,
      loan_deductions, orange_money_fee, total_deductions, net_salary,
      payment_method
    ) values (
      p_payroll_period_id, emp_record.id,
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
-- VIEWS
-- ---------------------------------------------------------------------

create or replace view v_employee_directory as
select
  e.id, e.employee_number, e.first_name, e.middle_name, e.last_name,
  e.first_name || ' ' || coalesce(e.middle_name || ' ', '') || e.last_name as full_name,
  e.photo_url, e.email, e.phone, e.employment_status, e.employment_type, e.date_hired,
  d.name as department_name, p.title as position_title,
  s.first_name || ' ' || s.last_name as supervisor_name
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
  coalesce(sum(pi.income_tax), 0) as total_income_tax
from payroll_periods pp
left join payroll_items pi on pi.payroll_period_id = pp.id
group by pp.id;

create or replace view v_department_headcount as
select d.id as department_id, d.name as department_name,
  count(e.id) filter (where e.employment_status = 'active') as active_headcount,
  coalesce(sum(e.basic_salary) filter (where e.employment_status = 'active'), 0) as total_basic_salary
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
  (lb.entitled_days - lb.used_days) as remaining_days
from leave_balances lb;
