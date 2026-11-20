# Project overview

Clinic Enquiry Tracker is a fictional clinic reception workflow for administrative enquiries. It does not provide medical care, store clinical records, send email or book appointments.

## Workflow

1. An enquirer submits fictional contact details, a category, preferred contact method and message.
2. Staff review the saved enquiry in a protected clinic inbox.
3. Staff mark it new, in progress or resolved and append internal notes.
4. Search and status, category and date filters support follow-up.

The independent `/demo` workflow uses browser memory and resets on refresh. The public form at `/` uses persistent database submissions when enabled.

## Data and access

- `clinics`: clinic identity.
- `staff_members`: verified account identity and clinic membership.
- `enquiries`: contact fields, message, reference, status and timestamps.
- `enquiry_notes`: enquiry, staff author, note and timestamp.
- Private submission receipts: idempotency and rate-limit records.

Internal notes never appear in public confirmations. Server validation, bounded bodies, trusted origins, Turnstile and atomic database limits protect public submissions. Row-level security limits staff access to their assigned clinic.

## Scope

The portfolio release demonstrates public submission, staff authentication, persistence, filters and follow-up. Real clinical use would require a separate privacy, retention and operational review.
