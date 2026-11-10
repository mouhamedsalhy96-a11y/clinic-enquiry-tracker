# Submission reliability verification

Run `supabase/tests/submission-reliability.sql` as one complete query in the dedicated development project's SQL Editor, using its default postgres role. Do not disable table RLS. The script switches to service_role internally to exercise the same privileged database function used by the server endpoint.

Expected result: `PASS: 23 submission reliability checks. All test data rolled back.`

This checks accepted inserts, fixed clinic/New status, retry deduplication, conflict rejection, failed-input/failed-receipt atomicity, three-per-email and thirty-global limits, and retries after quota exhaustion. Fictional test records and receipts are rolled back. Existing data is not modified.

Pause public submissions while running this short transaction: it holds the same advisory lock as the submission function. If more than 26 accepted submissions already exist in the current 15-minute window, the script stops and asks you to wait. Do not execute fragments or remove its ROLLBACK.

If an error appears, run `ROLLBACK;` separately if the editor reports an aborted transaction, then share the error. Do not change access policies or quotas just to pass a test.

Validation: both migrations and the 35 access checks plus 23 reliability checks passed in a temporary PGlite PostgreSQL runtime with a minimal Auth schema/auth.uid shim. An independent final query confirmed no fixture enquiries or receipts remained. This is sequential PostgreSQL validation; distributed concurrency/load behavior and the deployed Supabase instance still require their own verification.

After the Supabase test passes, the next release milestone is bot protection and deployment configuration. Production public submissions remain disabled until those are implemented and verified.
