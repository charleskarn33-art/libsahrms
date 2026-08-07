-- =====================================================================
-- LIBSA HRMS — Seed data (safe to run once against a fresh database)
-- =====================================================================

insert into company_settings (
  company_name, currency, employee_nasscorp_rate, employer_nasscorp_rate, income_tax_bands
)
select
  'LIBSA Consultancy', 'LRD', 4.00, 6.00,
  '[
    {"upTo": 10000, "rate": 0},
    {"upTo": 50000, "rate": 5},
    {"upTo": 130000, "rate": 10},
    {"upTo": null, "rate": 15}
  ]'::jsonb
where not exists (select 1 from company_settings);

insert into departments (name, code, description) values
  ('Executive Office', 'EXEC', 'Managing Director and executive leadership'),
  ('Human Resources', 'HR', 'Recruitment, employee relations, and HR operations'),
  ('Finance', 'FIN', 'Accounting, payroll, and financial control'),
  ('Operations', 'OPS', 'Client service delivery and operations'),
  ('Information Technology', 'IT', 'Systems, infrastructure, and support')
on conflict (name) do nothing;

insert into positions (title, department_id, salary_grade, min_salary, max_salary)
select v.title, d.id, v.grade, v.min_salary, v.max_salary
from (values
  ('Managing Director', 'Executive Office', 'Grade 1', 250000, 400000),
  ('HR Manager', 'Human Resources', 'Grade 3', 90000, 140000),
  ('Payroll Officer', 'Finance', 'Grade 4', 60000, 95000),
  ('Finance Manager', 'Finance', 'Grade 3', 100000, 150000),
  ('Software Engineer', 'Information Technology', 'Grade 4', 70000, 120000),
  ('Operations Associate', 'Operations', 'Grade 5', 40000, 65000)
) as v(title, dept, grade, min_salary, max_salary)
join departments d on d.name = v.dept
on conflict (title, department_id) do nothing;

insert into announcements (title, body, icon) values
  ('Public Holiday', 'Friday is a public holiday. The office will be closed.', 'info'),
  ('Salary Review', 'Salary review is effective from next month.', 'gift'),
  ('NASSCORP Update', 'New NASSCORP contribution rates are now in effect.', 'shield')
on conflict do nothing;
