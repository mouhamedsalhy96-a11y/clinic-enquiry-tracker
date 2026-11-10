-- Run as one complete query using the SQL Editor's default postgres role.
-- The function is exercised as service_role, exactly as the server calls it.
-- Stop public-form testing while this short suite holds its submission lock.
begin;
set local statement_timeout = '30s';
create temporary table submission_test_results (check_name text not null);
grant select, insert on submission_test_results to service_role;
create function pg_temp.check_submission(actual boolean, label text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into pg_temp.submission_test_results values(label);
end;
$$;
set local role service_role;
do $$
declare
  request_id uuid := gen_random_uuid();
  v_email_hash text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  payload_hash text := repeat('b',64);
  first_ref uuid;
  repeat_ref uuid;
  blocked boolean;
  start_enquiries bigint;
  start_receipts bigint;
  recent_count bigint;
  new_id uuid;
  i integer;
  input jsonb := '{"name":"Submission Reliability Test","email":"reliability@example.com","phone":"","category":"Clinic information","contactMethod":"email","message":"Fictional database reliability check. No follow-up is needed.","status":"resolved","clinic_id":"00000000-0000-4000-8000-000000000000","notes":["must be ignored"]}'::jsonb;
begin
  perform pg_advisory_xact_lock(743992275);
  select count(*) into recent_count from public.submission_receipts where created_at > now() - interval '15 minutes';
  if recent_count > 26 then
    raise exception 'Test needs four free quota slots. Wait 15 minutes and rerun the whole file.';
  end if;
  select count(*) into start_enquiries from public.enquiries;
  select count(*) into start_receipts from public.submission_receipts;

  first_ref := public.submit_public_enquiry(request_id,v_email_hash,payload_hash,input);
  perform pg_temp.check_submission(first_ref is not null,'Submission returns a reference');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 1 from public.enquiries),'Exactly one enquiry is inserted');
  perform pg_temp.check_submission((select count(*) = start_receipts + 1 from public.submission_receipts),'Exactly one receipt is inserted');
  perform pg_temp.check_submission((select clinic_id = '74399bb3-2275-4b0d-b9c9-f25be50bdf06'::uuid from public.enquiries where reference = first_ref),'Caller cannot override the target clinic');
  perform pg_temp.check_submission((select status = 'new' from public.enquiries where reference = first_ref),'Caller cannot override the New status');

  repeat_ref := public.submit_public_enquiry(request_id,v_email_hash,payload_hash,input);
  perform pg_temp.check_submission(repeat_ref = first_ref,'Identical retry returns the original reference');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 1 from public.enquiries),'Retry creates no duplicate enquiry');
  perform pg_temp.check_submission((select count(*) = start_receipts + 1 from public.submission_receipts),'Retry consumes no additional quota');

  blocked := false;
  begin
    perform public.submit_public_enquiry(request_id,v_email_hash,repeat('c',64),input);
  exception when invalid_parameter_value then blocked := (sqlerrm = 'request_conflict');
  end;
  perform pg_temp.check_submission(blocked,'Reusing a request ID for changed input is rejected');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 1 from public.enquiries),'Conflicting retry creates no enquiry');

  blocked := false;
  new_id := gen_random_uuid();
  begin
    perform public.submit_public_enquiry(new_id,v_email_hash,payload_hash,jsonb_set(input,'{name}','""'));
  exception when check_violation then blocked := true;
  end;
  perform pg_temp.check_submission(blocked,'Database rejects an invalid enquiry');
  perform pg_temp.check_submission(not exists(select 1 from public.submission_receipts where submission_receipts.request_id = new_id),'Invalid enquiry leaves no receipt');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 1 from public.enquiries),'Invalid enquiry leaves no partial record');

  blocked := false;
  begin
    -- This fails AFTER the enquiry insert, proving transaction atomicity.
    perform public.submit_public_enquiry(gen_random_uuid(),'invalid-hash',payload_hash,input);
  exception when check_violation then blocked := true;
  end;
  perform pg_temp.check_submission(blocked,'Invalid receipt is rejected');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 1 from public.enquiries),'Failed receipt rolls back the enquiry insert');
  perform pg_temp.check_submission((select count(*) = start_receipts + 1 from public.submission_receipts),'Failed receipt leaves no partial receipt');

  for i in 1..2 loop
    perform public.submit_public_enquiry(gen_random_uuid(),v_email_hash,payload_hash,input);
  end loop;
  perform pg_temp.check_submission((select count(*) = 3 from public.submission_receipts where submission_receipts.email_hash = v_email_hash),'Three submissions per email are accepted');
  blocked := false;
  begin
    perform public.submit_public_enquiry(gen_random_uuid(),v_email_hash,payload_hash,input);
  exception when sqlstate 'P0001' then blocked := (sqlerrm = 'submission_limit');
  end;
  perform pg_temp.check_submission(blocked,'Fourth submission per email is rejected');
  perform pg_temp.check_submission((select count(*) = start_enquiries + 3 from public.enquiries),'Email rate limit creates no extra enquiry');

  select count(*) into recent_count from public.submission_receipts where created_at > now() - interval '15 minutes';
  for i in 1..(30-recent_count)::integer loop
    perform public.submit_public_enquiry(gen_random_uuid(),md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),payload_hash,input);
  end loop;
  perform pg_temp.check_submission((select count(*) = 30 from public.submission_receipts where created_at > now() - interval '15 minutes'),'Global window accepts at most thirty submissions');
  blocked := false;
  begin
    perform public.submit_public_enquiry(gen_random_uuid(),md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),payload_hash,input);
  exception when sqlstate 'P0001' then blocked := (sqlerrm = 'submission_limit');
  end;
  perform pg_temp.check_submission(blocked,'Thirty-first global submission is rejected');
  perform pg_temp.check_submission((select count(*) = 30 from public.submission_receipts where created_at > now() - interval '15 minutes'),'Global limit leaves no extra receipt');
  repeat_ref := public.submit_public_enquiry(request_id,v_email_hash,payload_hash,input);
  perform pg_temp.check_submission(repeat_ref = first_ref,'Existing retry succeeds even when the quota is full');
end;
$$;
reset role;
select 'PASS: ' || count(*) || ' submission reliability checks. All test data rolled back.' as result
from pg_temp.submission_test_results;
rollback;
