-- Apply once after the initial schema. No anonymous table/RPC access is granted.
begin;
create table public.submission_receipts (
  request_id uuid primary key,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  reference uuid not null,
  created_at timestamptz not null default now()
);
create index submission_receipts_email_date on public.submission_receipts(email_hash, created_at);
create index submission_receipts_date on public.submission_receipts(created_at);
alter table public.submission_receipts enable row level security;
revoke all on public.submission_receipts from public, anon, authenticated;
grant select, insert on public.submission_receipts to service_role;
grant insert, select on public.enquiries to service_role;

create function public.submit_public_enquiry(p_request_id uuid, p_email_hash text, p_payload_hash text, p_input jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  previous public.submission_receipts%rowtype;
  saved_reference uuid;
begin
  -- One short serialized transaction makes checks and insertion atomic.
  perform pg_advisory_xact_lock(743992275);
  select * into previous from public.submission_receipts where request_id = p_request_id;
  if found then
    if previous.email_hash <> p_email_hash or previous.payload_hash <> p_payload_hash then
      raise exception using errcode = '22023', message = 'request_conflict';
    end if;
    return previous.reference;
  end if;
  if (select count(*) from public.submission_receipts where created_at > now() - interval '15 minutes') >= 30
     or (select count(*) from public.submission_receipts where email_hash = p_email_hash and created_at > now() - interval '15 minutes') >= 3 then
    raise exception using errcode = 'P0001', message = 'submission_limit';
  end if;
  insert into public.enquiries(clinic_id, name, email, phone, category, contact_method, message)
  values ('74399bb3-2275-4b0d-b9c9-f25be50bdf06', p_input->>'name', p_input->>'email',
    coalesce(p_input->>'phone', ''), p_input->>'category', p_input->>'contactMethod', p_input->>'message')
  returning reference into saved_reference;
  insert into public.submission_receipts(request_id, email_hash, payload_hash, reference)
  values (p_request_id, p_email_hash, p_payload_hash, saved_reference);
  return saved_reference;
end;
$$;
revoke all on function public.submit_public_enquiry(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_enquiry(uuid, text, text, jsonb) to service_role;
commit;

