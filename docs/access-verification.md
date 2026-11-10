# Database access verification

Run `supabase/tests/access-control.sql` as one complete query in the dedicated Supabase development project's SQL Editor, using its default postgres role. Both migrations must already be applied.

Expected final result:

`PASS: 35 database access checks. All test data rolled back.`

The suite creates four fictional Auth users, two fictional clinics, two enquiries and private notes inside a transaction. It assigns no login passwords and sends no email. Reserved fixture IDs must not already exist; an ID collision stops the test instead of updating an existing account. All fixture writes and helpers are rolled back. Do not execute selected fragments.

Checks cover active staff's allowed reads and writes; clinic isolation in both directions; anonymous, non-staff and inactive accounts; note authorship; restrictions on editing messages/notes, moving enquiries, granting memberships and reading server receipts; and privileged submission-function access.

If any statement fails, do not change policies to make the test pass. Run `ROLLBACK;` in a separate query if the editor reports an aborted transaction, then share the error text. The suite fails immediately when a forbidden operation succeeds.

## Validation performed

The migrations and complete 35-check suite passed in a temporary PGlite PostgreSQL runtime with a minimal Auth schema and auth.uid() shim. A subsequent query confirmed no fixture Auth users survived rollback. This checks SQL syntax and PostgreSQL role/RLS behavior; it does not replace running against Supabase's actual Auth schema, grants and deployed policies. No new runtime dependency was added to the application.

The suite does not verify Auth token issuance/revocation, production bot protection, submission quotas under concurrency, or public deployment readiness. Those remain separate checks.
