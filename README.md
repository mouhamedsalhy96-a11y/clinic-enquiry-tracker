# Enquiry â€” Clinic Enquiry Tracker

A focused web app for a clinic reception team to review administrative enquiries, track follow-up, and keep internal notes.

Built as a portfolio demonstration using **fictional data only**. It does not provide medical care, store clinical records, send emails, or book appointments.

## Features

- Public enquiry form with field validation and Cloudflare Turnstile verification.
- Persistent submissions with a confirmation reference and duplicate prevention on retries.
- Staff sign-in and a protected inbox.
- Search by name, email, or reference; filter by status, enquiry type, and received date.
- New, In progress, and Resolved workflow states.
- Internal notes attributed to the signed-in staff account.
- Clinic-based database access policies and administrator-managed staff membership.
- An independent sample workflow at `/demo`, with an in-memory form at `/demo/enquire`.

## Stack

Next.js App Router Â· React Â· TypeScript Â· Tailwind CSS Â· Supabase Auth and PostgreSQL Â· Cloudflare Turnstile

## Access and submission controls

Staff can read their assigned clinic's enquiries, change status, and append notes. They cannot assign memberships, move records between clinics, rewrite enquiry messages, or edit/delete saved notes. Anonymous visitors cannot read the database or execute the privileged submission function.

Public saves go through the server, with validation, bounded request bodies, trusted-origin checks, bot verification, and atomic database limits. Retrying the same submission returns its existing reference. Hosted submissions require an explicit enable setting.

Only the public configuration belongs in browser code. Server keys stay in environment variables; `.env.local` is excluded from Git and deployment uploads. `.env.example` contains empty placeholders.

## Verification

- 46 automated tests cover validation, filtering, authentication, authorization, submission behavior, Turnstile failures, and trusted origins.
- ESLint, TypeScript, and the production build pass.
- 35 database access checks and 23 submission reliability checks passed locally and were confirmed in the development Supabase project.
- Local submission, sign-in, status/note persistence, and sign-out were verified.

The deployed workflow has also been checked with fictional submissions, staff updates, persistence and sign-out. Automated mocks do not replace database or browser verification.

## Project links

- [Live demonstration](https://clinic-enquiry-tracker.vercel.app/)
- [Source repository](https://github.com/mouhamedsalhy96-a11y/clinic-enquiry-tracker)

## Technical documentation

- [Database architecture](docs/database-setup.md)
- [Public submissions](docs/public-submissions.md)
- [Turnstile integration](docs/turnstile.md)
- [Database access tests](docs/access-verification.md)
- [Submission reliability tests](docs/submission-verification.md)
- [Deployment configuration](docs/deployment.md)

Validation commands: `npm test`, `npm run lint`, `npm run build`.
