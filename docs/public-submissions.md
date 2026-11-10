# Persistent public submissions — local development

This milestone adds database-backed fictional enquiries to `/`. `/demo/enquire` retains the in-memory example. `/staff` reads saved entries after a refresh.

## Setup

1. Run `supabase/migrations/202611090002_public_submissions.sql` once in Supabase SQL Editor.
2. In `.env.local`, add `SUPABASE_SECRET_KEY=` with the project's secret API key from Project Settings > API Keys. Keep this server-only: never prefix it NEXT_PUBLIC_, paste it in chat, or commit it. It has elevated database access.
3. Restart `npm run dev` and open http://127.0.0.1:3000.
4. Submit one fictional enquiry. Save the reference, sign into `/staff`, and refresh the inbox. Update status, add a note, refresh, then sign out and verify protected access.

## Controls

- The API repeats field validation and requires fictional-data acknowledgement.
- Same-origin JSON POST only, 16 KiB body limit, and a honeypot.
- The browser cannot call the database function: only service_role can execute it, using a separate server-only client with no staff session attached.
- The function always targets the seeded demo clinic and defaults status to new. It never accepts notes, authors, or clinic membership from the browser.
- An atomic database limit allows three accepted submissions per hashed email and thirty globally per fifteen minutes. The hash is keyed with the server secret. Changing the secret changes these hashes.
- A request UUID and normalized payload hash make identical retries return the same reference. Keep the form open with the same details if a network failure leaves the outcome uncertain. Different details under an already-used UUID are rejected.
- Public success returns only the reference. Internal notes, records and provider errors are never returned.
- Receipt hashes and request UUIDs remain in a staff-inaccessible table for idempotency. A retention policy is required before production.

## Release boundary

Public saves are deliberately disabled under NODE_ENV=production, even with a secret configured. This prevents accidental deployment of the local milestone. Configure bot protection, review submission quotas/retention, verify non-staff and cross-clinic access, and complete database behavior tests before enabling a hosted public endpoint. Do not simply remove the environment check.

## Verification status

Unit tests cover validation, request scoping, response privacy, request hashes, provider failures, limits, origin/body checks and the production lock. SQL behavior and live persistence require applying the migration and configuring the server secret; they are not proven by mocks.

Database reliability suite: run `supabase/tests/submission-reliability.sql` as one whole query in the development SQL Editor. See `docs/submission-verification.md` for its 23 checks and rollback behavior.
