# Project brief

## Problem

A small clinic needs a clear view of administrative enquiries and their follow-up status.

## Users

- An enquirer asking about availability, clinic information, or administrative arrangements.
- A staff member reviewing requests and recording follow-up actions.

## Core workflow

1. Submit an enquiry with name, email, optional phone, category, preferred contact method, and message.
2. Review it in the staff inbox.
3. Mark it new, in progress, or resolved.
4. Add an internal administrative note.
5. Search and filter by status, category, or received date.

## Data model planned for Supabase

- `staff_members`: verified user identity and clinic membership.
- `enquiries`: clinic, reference, contact fields, category, message, workflow status, created/updated timestamps.
- `enquiry_notes`: enquiry, staff author, note text, and timestamp.
- Access policies: active staff can only read/change their clinic's enquiries and notes. Public users cannot read the inbox.

Internal notes must never appear in public confirmations. Public submission needs server validation, size limits, rate limiting, and bot protection before production access.

## Milestones

1. **Frontend demo:** public form, inbox, filters, details, notes, and statuses using fictional data. This is the current milestone.
2. **Persistent core:** Supabase migrations, staff sign-in/sign-out, protected inbox, reliable saves and error states.
3. **Verification:** database access-policy tests, end-to-end workflow checks, responsive and accessibility review.
4. **AI drafting:** convert fictional enquiry text into a proposed entry, require staff review before saving, and apply usage limits.
5. **Portfolio release:** deployment, demo access strategy, screenshots, short walkthrough, and a factual case study.

## Definition of finished

The hosted demonstration allows a reviewer to complete the public-to-staff workflow with fictional data; staff access is protected; database tests prove isolation; server failures show actionable errors; the app builds and deploys; and the case study states its scope and limitations accurately.

## Learning checkpoint

After each feature, explain its input, validation, state or database change, error path, and one test. Make one small modification yourself before moving on.
