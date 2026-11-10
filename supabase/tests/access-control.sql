-- Run the entire file as postgres in the dedicated Supabase development project.
-- All fictional fixtures and test helpers are rolled back; never run fragments.
begin;
set local statement_timeout = '30s';
create temporary table access_test_results (check_name text not null);
grant select, insert on access_test_results to anon, authenticated, service_role;
create function pg_temp.assert_true(actual boolean, label text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into pg_temp.access_test_results values (label);
end;
$$;
create function pg_temp.expect_denied(statement text, label text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  begin
    execute statement;
    raise exception 'FAIL (operation was allowed): %', label;
  exception when insufficient_privilege then
    insert into pg_temp.access_test_results values (label);
  end;
end;
$$;

-- No existing user or clinic is modified. Colliding IDs cause the test to stop.
insert into auth.users(id, email, aud, role) values
 ('9f900000-0000-4000-8000-000000000001','access-test-a@example.com','authenticated','authenticated'),
 ('9f900000-0000-4000-8000-000000000002','access-test-b@example.com','authenticated','authenticated'),
 ('9f900000-0000-4000-8000-000000000003','access-test-nonstaff@example.com','authenticated','authenticated'),
 ('9f900000-0000-4000-8000-000000000004','access-test-inactive@example.com','authenticated','authenticated');
insert into public.clinics(id,name) values
 ('9f910000-0000-4000-8000-000000000001','Fictional access clinic A'),
 ('9f910000-0000-4000-8000-000000000002','Fictional access clinic B');
insert into public.staff_members(user_id,clinic_id,active) values
 ('9f900000-0000-4000-8000-000000000001','9f910000-0000-4000-8000-000000000001',true),
 ('9f900000-0000-4000-8000-000000000002','9f910000-0000-4000-8000-000000000002',true),
 ('9f900000-0000-4000-8000-000000000004','9f910000-0000-4000-8000-000000000001',false);
insert into public.enquiries(id,clinic_id,name,email,category,contact_method,message) values
 ('9f920000-0000-4000-8000-000000000001','9f910000-0000-4000-8000-000000000001','Fictional Test A','test-a@example.com','Clinic information','email','Fictional enquiry for access checks.'),
 ('9f920000-0000-4000-8000-000000000002','9f910000-0000-4000-8000-000000000002','Fictional Test B','test-b@example.com','Clinic information','email','Fictional enquiry for access checks.');
insert into public.enquiry_notes(enquiry_id,author_id,text) values
 ('9f920000-0000-4000-8000-000000000001','9f900000-0000-4000-8000-000000000001','Fictional private note A.'),
 ('9f920000-0000-4000-8000-000000000002','9f900000-0000-4000-8000-000000000002','Fictional private note B.');


reset role;
set local role anon;

select set_config('request.jwt.claim.sub', '', true);

select set_config('request.jwt.claims', '{"role": "anon"}', true);

select pg_temp.expect_denied('select * from public.clinics limit 1', 'Anonymous cannot read clinics');

select pg_temp.expect_denied('select * from public.staff_members limit 1', 'Anonymous cannot read staff_members');

select pg_temp.expect_denied('select * from public.enquiries limit 1', 'Anonymous cannot read enquiries');

select pg_temp.expect_denied('select * from public.enquiry_notes limit 1', 'Anonymous cannot read enquiry_notes');

select pg_temp.expect_denied('select * from public.submission_receipts limit 1', 'Anonymous cannot read submission_receipts');

select pg_temp.expect_denied('select public.submit_public_enquiry(gen_random_uuid(), repeat(''a'',64), repeat(''b'',64), ''{}''::jsonb)', 'Anonymous cannot execute server submission function');

reset role;
set local role authenticated;

select set_config('request.jwt.claim.sub', '9f900000-0000-4000-8000-000000000001', true);

select set_config('request.jwt.claims', '{"sub": "9f900000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select pg_temp.assert_true((auth.uid() = '9f900000-0000-4000-8000-000000000001'::uuid), 'Tests run with authenticated identity A');

select pg_temp.assert_true((select count(*) = 1 from public.clinics where id in ('9f910000-0000-4000-8000-000000000001','9f910000-0000-4000-8000-000000000002')), 'Staff A sees only its clinic');

select pg_temp.assert_true((select count(*) = 1 from public.enquiries where id in ('9f920000-0000-4000-8000-000000000001','9f920000-0000-4000-8000-000000000002')), 'Staff A sees only its enquiry');

select pg_temp.assert_true((select count(*) = 1 from public.enquiry_notes where enquiry_id in ('9f920000-0000-4000-8000-000000000001','9f920000-0000-4000-8000-000000000002')), 'Staff A sees only its internal notes');

update public.enquiries set status = 'in_progress' where id = '9f920000-0000-4000-8000-000000000001';

select pg_temp.assert_true((select status = 'in_progress' from public.enquiries where id = '9f920000-0000-4000-8000-000000000001'), 'Own-clinic status update persists');

insert into public.enquiry_notes(enquiry_id,author_id,text) values ('9f920000-0000-4000-8000-000000000001','9f900000-0000-4000-8000-000000000001','Staff A saved this fictional note.');

select pg_temp.assert_true((select count(*) = 2 from public.enquiry_notes where enquiry_id = '9f920000-0000-4000-8000-000000000001'), 'Own-clinic note insert persists');

with changed as (update public.enquiries set status = 'resolved' where id = '9f920000-0000-4000-8000-000000000002' returning id) select pg_temp.assert_true((select count(*) = 0 from changed), 'Staff A cannot update another clinic status');

select pg_temp.expect_denied('insert into public.enquiry_notes(enquiry_id,author_id,text) values (''9f920000-0000-4000-8000-000000000002'',''9f900000-0000-4000-8000-000000000001'',''Cross-clinic attack test.'')', 'Staff A cannot add notes to another clinic');

select pg_temp.expect_denied('insert into public.enquiry_notes(enquiry_id,author_id,text) values (''9f920000-0000-4000-8000-000000000001'',''9f900000-0000-4000-8000-000000000002'',''Spoofed author attack test.'')', 'Staff cannot spoof note author');

select pg_temp.expect_denied('update public.enquiries set message = ''Tampered enquiry message.'' where id = ''9f920000-0000-4000-8000-000000000001''', 'Staff cannot rewrite enquiry message');

select pg_temp.expect_denied('update public.enquiries set clinic_id = ''9f910000-0000-4000-8000-000000000002'' where id = ''9f920000-0000-4000-8000-000000000001''', 'Staff cannot move an enquiry to another clinic');

select pg_temp.expect_denied('update public.enquiry_notes set text = ''Tampered note'' where enquiry_id = ''9f920000-0000-4000-8000-000000000001''', 'Staff cannot edit saved notes');

select pg_temp.expect_denied('delete from public.enquiry_notes where enquiry_id = ''9f920000-0000-4000-8000-000000000001''', 'Staff cannot delete saved notes');

select pg_temp.expect_denied('update public.staff_members set active = true', 'Staff cannot grant clinic membership');

select pg_temp.expect_denied('select * from public.submission_receipts', 'Staff cannot read server submission receipts');

select pg_temp.expect_denied('select public.submit_public_enquiry(gen_random_uuid(), repeat(''a'',64), repeat(''b'',64), ''{}''::jsonb)', 'Staff cannot invoke privileged public submission function');

reset role;
set local role authenticated;

select set_config('request.jwt.claim.sub', '9f900000-0000-4000-8000-000000000002', true);

select set_config('request.jwt.claims', '{"sub": "9f900000-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select pg_temp.assert_true((select count(*) = 0 from public.enquiries where id = '9f920000-0000-4000-8000-000000000001'), 'Staff B cannot read clinic A enquiry');

select pg_temp.assert_true((select count(*) = 1 from public.enquiries where id = '9f920000-0000-4000-8000-000000000002'), 'Staff B can read its own enquiry');

select pg_temp.assert_true((select count(*) = 0 from public.enquiry_notes where enquiry_id = '9f920000-0000-4000-8000-000000000001'), 'Staff B cannot read clinic A notes');

reset role;
set local role authenticated;

select set_config('request.jwt.claim.sub', '9f900000-0000-4000-8000-000000000003', true);

select set_config('request.jwt.claims', '{"sub": "9f900000-0000-4000-8000-000000000003", "role": "authenticated"}', true);

select pg_temp.assert_true((select count(*) = 0 from public.enquiries), 'Non-staff account cannot read any enquiries');

select pg_temp.assert_true((select count(*) = 0 from public.enquiry_notes), 'Non-staff account cannot read any notes');

with changed as (update public.enquiries set status = 'resolved' where id = '9f920000-0000-4000-8000-000000000001' returning id) select pg_temp.assert_true((select count(*) = 0 from changed), 'Non-staff account cannot change status');

select pg_temp.expect_denied('insert into public.enquiry_notes(enquiry_id,author_id,text) values (''9f920000-0000-4000-8000-000000000001'',''9f900000-0000-4000-8000-000000000003'',''Unauthorized note attempt.'')', 'Non-staff account cannot add notes');

select pg_temp.expect_denied('insert into public.staff_members(user_id,clinic_id) values (''9f900000-0000-4000-8000-000000000003'',''9f910000-0000-4000-8000-000000000001'')', 'Non-staff account cannot assign itself staff membership');

reset role;
set local role authenticated;

select set_config('request.jwt.claim.sub', '9f900000-0000-4000-8000-000000000004', true);

select set_config('request.jwt.claims', '{"sub": "9f900000-0000-4000-8000-000000000004", "role": "authenticated"}', true);

select pg_temp.assert_true((select count(*) = 0 from public.enquiries), 'Inactive staff account cannot read any enquiries');

select pg_temp.assert_true((select count(*) = 0 from public.enquiry_notes), 'Inactive staff account cannot read any notes');

with changed as (update public.enquiries set status = 'resolved' where id = '9f920000-0000-4000-8000-000000000001' returning id) select pg_temp.assert_true((select count(*) = 0 from changed), 'Inactive staff account cannot change status');

select pg_temp.expect_denied('insert into public.enquiry_notes(enquiry_id,author_id,text) values (''9f920000-0000-4000-8000-000000000001'',''9f900000-0000-4000-8000-000000000004'',''Unauthorized note attempt.'')', 'Inactive staff account cannot add notes');

select pg_temp.expect_denied('insert into public.staff_members(user_id,clinic_id) values (''9f900000-0000-4000-8000-000000000004'',''9f910000-0000-4000-8000-000000000001'')', 'Inactive staff account cannot assign itself staff membership');

reset role;
set local role postgres;

select set_config('request.jwt.claim.sub', '', true);

select set_config('request.jwt.claims', '{"role": "postgres"}', true);

select 'PASS: ' || count(*) || ' database access checks. All test data rolled back.' as result from pg_temp.access_test_results;
rollback;
