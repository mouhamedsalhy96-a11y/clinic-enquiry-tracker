# Database setup — development project

1. Open Supabase > SQL Editor > New query.
2. Paste `supabase/migrations/202611090001_initial_schema.sql` and run it once.
3. The result should be `Success. No rows returned`.
4. Run `supabase/verify-schema.sql`. All four rows should report `rls_enabled = true` and `anonymous_has_access = false`.

The migration creates clinics, administrator-managed staff memberships, enquiries, and internal notes. It creates one fictional clinic, but no staff account and no sample enquiries. Each staff account belongs to one clinic. Authenticated staff can read that clinic's inbox, update only status, and append notes under their own user ID. Notes cannot be edited or deleted through the client.

Public submissions remain in browser demo memory until the server submission workflow and abuse controls are implemented. There is no public database insert policy. Signing up alone never grants staff membership.

Do not rerun the initial migration after success. If it fails, copy the error text without credentials; the transaction prevents a partial installation. The verification query checks schema configuration, not behavioral isolation. Staff, non-staff, cross-clinic, and anonymous behavior tests follow before release.

Next: create a staff account and assign its membership through an administrator-only SQL step, then connect staff login and the protected inbox.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Staff account setup

Create a confirmed email/password user in Authentication > Users. An administrator then assigns its UID in `public.staff_members` to the seeded clinic UUID. No browser or public signup can assign memberships. The staff login is `/login`; the protected inbox is `/staff`.

Owner verification: sign in, confirm the empty database inbox, refresh, sign out, then revisit `/staff` and confirm redirection to login. Do not send passwords in chat. Status/note persistence checks require a fictional saved enquiry and follow in the next milestone.

Database behavior suite: run `supabase/tests/access-control.sql` as one whole query in the development SQL Editor. See `docs/access-verification.md` for expected results and rollback behavior.
