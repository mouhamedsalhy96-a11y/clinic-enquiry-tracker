-- Run once in the dedicated development project's SQL Editor.
-- Staff membership is assigned by an administrator, never by public signup.
begin;

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  created_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_members_clinic_idx on public.staff_members(clinic_id);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  reference uuid not null unique default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null default '' check (phone = '' or (phone ~ '^\+?[0-9 ().-]{7,30}$' and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15)),
  category text not null check (category in ('Appointment availability', 'Clinic information', 'Callback request', 'Other administration')),
  contact_method text not null check (contact_method in ('email', 'phone')),
  message text not null check (char_length(btrim(message)) between 10 and 1500),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_method <> 'phone' or phone <> '')
);
create index enquiries_clinic_received_idx on public.enquiries(clinic_id, created_at desc);
create index enquiries_clinic_status_idx on public.enquiries(clinic_id, status);

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index enquiry_notes_enquiry_idx on public.enquiry_notes(enquiry_id, created_at);

create function public.touch_enquiry_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_enquiry_updated_at() from public, anon, authenticated;
create trigger enquiries_touch_updated_at before update on public.enquiries
for each row execute function public.touch_enquiry_updated_at();

alter table public.clinics enable row level security;
alter table public.staff_members enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_notes enable row level security;

-- Explicit privileges also prevent changing clinic membership or enquiry content.
revoke all on public.clinics, public.staff_members, public.enquiries, public.enquiry_notes from anon, authenticated;
grant select on public.clinics, public.staff_members, public.enquiries, public.enquiry_notes to authenticated;
grant update (status) on public.enquiries to authenticated;
grant insert (enquiry_id, author_id, text) on public.enquiry_notes to authenticated;

create policy staff_read_own_membership on public.staff_members
for select to authenticated using (user_id = (select auth.uid()));

create policy staff_read_clinic on public.clinics
for select to authenticated using (exists (
  select 1 from public.staff_members s
  where s.user_id = (select auth.uid()) and s.clinic_id = clinics.id and s.active
));

create policy staff_read_enquiries on public.enquiries
for select to authenticated using (exists (
  select 1 from public.staff_members s
  where s.user_id = (select auth.uid()) and s.clinic_id = enquiries.clinic_id and s.active
));

create policy staff_update_enquiry_status on public.enquiries
for update to authenticated using (exists (
  select 1 from public.staff_members s
  where s.user_id = (select auth.uid()) and s.clinic_id = enquiries.clinic_id and s.active
)) with check (exists (
  select 1 from public.staff_members s
  where s.user_id = (select auth.uid()) and s.clinic_id = enquiries.clinic_id and s.active
));

create policy staff_read_notes on public.enquiry_notes
for select to authenticated using (exists (
  select 1 from public.enquiries e where e.id = enquiry_notes.enquiry_id
));

create policy staff_add_notes on public.enquiry_notes
for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (
    select 1 from public.enquiries e where e.id = enquiry_notes.enquiry_id
  )
);

-- The public form stays in demo mode until server validation and abuse controls
-- are connected. There is deliberately no anonymous table access or insert RPC.
insert into public.clinics(id, name)
values ('74399bb3-2275-4b0d-b9c9-f25be50bdf06', 'Demo clinic');

commit;
