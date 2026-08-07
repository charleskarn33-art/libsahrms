-- =====================================================================
-- LIBSA HRMS — Seed data (safe to run once against a fresh database,
-- after all migrations including 0005/0006 multi-company support)
-- =====================================================================

do $$
declare
  v_company_id uuid;
begin
  select id into v_company_id from companies where slug = 'libsa-consultancy';

  if v_company_id is null then
    insert into companies (
      name, slug, currency, employee_nasscorp_rate, employer_nasscorp_rate, income_tax_bands
    )
    values (
      'LIBSA Consultancy', 'libsa-consultancy', 'LRD', 4.00, 6.00,
      '[
        {"upTo": 10000, "rate": 0},
        {"upTo": 50000, "rate": 5},
        {"upTo": 130000, "rate": 10},
        {"upTo": null, "rate": 15}
      ]'::jsonb
    )
    returning id into v_company_id;
  end if;

  insert into departments (company_id, name, code, description)
  select v_company_id, v.name, v.code, v.description
  from (values
    ('Executive Office', 'EXEC', 'Managing Director and executive leadership'),
    ('Human Resources', 'HR', 'Recruitment, employee relations, and HR operations'),
    ('Finance', 'FIN', 'Accounting, payroll, and financial control'),
    ('Operations', 'OPS', 'Client service delivery and operations'),
    ('Information Technology', 'IT', 'Systems, infrastructure, and support')
  ) as v(name, code, description)
  on conflict (company_id, name) do nothing;

  insert into positions (company_id, title, department_id, salary_grade, min_salary, max_salary)
  select v_company_id, v.title, d.id, v.grade, v.min_salary, v.max_salary
  from (values
    ('Managing Director', 'Executive Office', 'Grade 1', 250000, 400000),
    ('HR Manager', 'Human Resources', 'Grade 3', 90000, 140000),
    ('Payroll Officer', 'Finance', 'Grade 4', 60000, 95000),
    ('Finance Manager', 'Finance', 'Grade 3', 100000, 150000),
    ('Software Engineer', 'Information Technology', 'Grade 4', 70000, 120000),
    ('Operations Associate', 'Operations', 'Grade 5', 40000, 65000)
  ) as v(title, dept, grade, min_salary, max_salary)
  join departments d on d.name = v.dept and d.company_id = v_company_id
  on conflict (company_id, title, department_id) do nothing;

  insert into announcements (company_id, title, body, icon)
  select v_company_id, v.title, v.body, v.icon
  from (values
    ('Public Holiday', 'Friday is a public holiday. The office will be closed.', 'info'),
    ('Salary Review', 'Salary review is effective from next month.', 'gift'),
    ('NASSCORP Update', 'New NASSCORP contribution rates are now in effect.', 'shield')
  ) as v(title, body, icon)
  on conflict do nothing;
end;
$$;
