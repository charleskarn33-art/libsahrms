-- =====================================================================
-- LIBSA HRMS — Storage buckets & policies
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('employee-documents', 'employee-documents', false, 20971520, null),
  ('payslips', 'payslips', false, 10485760, array['application/pdf']),
  ('company-assets', 'company-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

-- avatars: any authenticated user can read; users manage their own folder (avatars/{uid}/...)
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- company-assets: public read, HR/Admin write
create policy "company_assets_public_read" on storage.objects for select using (bucket_id = 'company-assets');
create policy "company_assets_hr_write" on storage.objects for all
  using (bucket_id = 'company-assets' and is_hr_or_admin())
  with check (bucket_id = 'company-assets' and is_hr_or_admin());

-- employee-documents: HR/Admin manage; employee can read their own folder (employee-documents/{employee_id}/...)
create policy "employee_documents_hr_all" on storage.objects for all
  using (bucket_id = 'employee-documents' and is_hr_or_admin())
  with check (bucket_id = 'employee-documents' and is_hr_or_admin());
create policy "employee_documents_owner_read" on storage.objects for select
  using (
    bucket_id = 'employee-documents'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and e.profile_id = auth.uid()
    )
  );

-- payslips: strictly payroll staff + the owning employee (payslips/{employee_id}/...)
create policy "payslips_payroll_staff_all" on storage.objects for all
  using (bucket_id = 'payslips' and is_payroll_staff())
  with check (bucket_id = 'payslips' and is_payroll_staff());
create policy "payslips_owner_read" on storage.objects for select
  using (
    bucket_id = 'payslips'
    and exists (
      select 1 from employees e
      where e.id::text = (storage.foldername(name))[1]
        and e.profile_id = auth.uid()
    )
  );
