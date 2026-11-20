# Database architecture

Migrations in `supabase/migrations` are applied once in timestamp order. The initial schema creates clinics, staff memberships, enquiries and internal notes, with a seeded fictional clinic. The second migration adds the server-only submission function and private receipt records.

Staff membership is administrator-managed in `public.staff_members`. Each account belongs to one clinic; signup alone grants no inbox access. Staff can read their clinic's enquiries, update status and append notes under their own identity. Saved notes cannot be edited or deleted through the client.

Confirmed Supabase Auth users sign in at `/login`; `/staff` requires an active membership. Public submissions use a separate privileged server client, with no anonymous table insert or RPC permission.

`supabase/verify-schema.sql` inspects the four core tables for row-level security and anonymous access. Behavioral isolation is covered by [access tests](access-verification.md); submission behavior is covered by [reliability tests](submission-verification.md).
