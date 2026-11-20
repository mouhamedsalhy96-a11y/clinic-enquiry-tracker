# Persistent public submissions

The public form at `/` saves fictional enquiries through `/api/enquiries`. `/demo/enquire` remains an in-memory example; `/staff` reads persisted records.

## Configuration

The workflow requires both database migrations, the public Supabase URL and key, a server-only `SUPABASE_SECRET_KEY`, and [Turnstile configuration](turnstile.md). Hosted saves also require `PUBLIC_SUBMISSIONS_ENABLED=true` and a trusted deployment origin. Server secrets are excluded from browser code and version control.

## Controls

- Repeated field validation and fictional-data acknowledgement.
- Same-origin JSON POST requests, a 16 KiB body limit and a honeypot.
- Turnstile verification before the database call.
- A submission function executable only by `service_role`, using a server client without a staff session.
- A fixed demo clinic and new status; browser input cannot assign notes, authors or memberships.
- Atomic limits of three accepted submissions per hashed email and thirty globally per fifteen minutes. Hashes are keyed with the server secret; rotating it changes those hashes.
- Request UUID and normalized payload hash for retry deduplication. Reusing a UUID with different details is rejected.
- Public responses contain only the confirmation reference, without notes or provider errors.

Receipt hashes and UUIDs remain in a staff-inaccessible table. A retention policy is required before production use.

## Verification

Automated tests cover validation, response privacy, request hashing, failures, limits, origins, body size and the deployment enable switch. The [database reliability suite](submission-verification.md) covers persistence and transaction behavior. Live verification covers submission, inbox refresh, status changes, notes and protected access after sign-out.
