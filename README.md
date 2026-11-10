# Enquiry — Clinic Enquiry Tracker

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

Next.js App Router · React · TypeScript · Tailwind CSS · Supabase Auth and PostgreSQL · Cloudflare Turnstile

## Access and submission controls

Staff can read their assigned clinic's enquiries, change status, and append notes. They cannot assign memberships, move records between clinics, rewrite enquiry messages, or edit/delete saved notes. Anonymous visitors cannot read the database or execute the privileged submission function.

Public saves go through the server, with validation, bounded request bodies, trusted-origin checks, bot verification, and atomic database limits. Retrying the same submission returns its existing reference. Hosted submissions require an explicit enable setting.

Only the public configuration belongs in browser code. Server keys stay in environment variables; `.env.local` is excluded from Git and deployment uploads. `.env.example` contains empty placeholders.

## Verification

- 46 automated tests cover validation, filtering, authentication, authorization, submission behavior, Turnstile failures, and trusted origins.
- ESLint, TypeScript, and the production build pass.
- 35 database access checks and 23 submission reliability checks passed locally and were confirmed in the development Supabase project.
- Local submission, sign-in, status/note persistence, and sign-out were verified.

Hosted checks are pending deployment. Automated mocks do not replace database or browser verification.

## Setup and deployment

Use Node.js and npm. Copy `.env.example` to `.env.local`, then follow the database and Turnstile setup documents before starting the persistent workflow.

```sh
npm install
npm run dev
```

```sh
npm test
npm run lint
npm run build
```

- [Database setup](docs/database-setup.md)
- [Public submissions](docs/public-submissions.md)
- [Turnstile setup](docs/turnstile.md)
- [Database access tests](docs/access-verification.md)
- [Submission reliability tests](docs/submission-verification.md)
- [Vercel deployment](docs/deployment.md)

This project is under development. The deployment guide lists the environment variables and hosted verification steps.
