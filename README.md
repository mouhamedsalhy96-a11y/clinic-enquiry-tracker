# Enquiry — Clinic Enquiry Tracker

A portfolio project for administrative clinic enquiries, built with Next.js, React, TypeScript, and Supabase. Use fictional details only.

## Current workflow

- `/`: database-backed public form for local fictional-data testing (requires the second migration and a server secret).
- `/demo/enquire`: in-memory sample form.
- `/demo`: sample inbox; changes reset on refresh.
- `/login`: email/password login for administrator-assigned staff.
- `/staff`: protected Supabase inbox with search, status/type/date filters, saved status changes, and internal notes.

Staff records persist in Supabase. Public submissions save through a server endpoint after setup; the sample form stays in memory. Hosted public saves require trusted HTTPS origins, Turnstile, and an explicit enable setting. No emails are sent. Staff membership is checked on every server read/write, and row-level security limits access to the assigned clinic. Signing up alone does not grant staff access. Status updates are restricted to the status column; note authorship comes from the verified session.

## Development

Copy `.env.example` to `.env.local` and supply the project URL and publishable key. Keep credentials out of source control. See `docs/database-setup.md` for the database migration.

```powershell
npm install
npm run dev
```

```powershell
npm test
npm run lint
npm run build
```

## Verification and next work

Automated tests cover enquiry validation/filtering and mocked authentication/action authorization paths. Production build and lint checks are run during implementation. Anonymous live database reads were denied for all four tables. Signed-out `/staff` navigation redirects to login and invalid credentials show an error.

Successful login, logout, and persistence still need verification using the owner's staff account. Mocked tests do not prove cross-clinic database isolation; behavioral RLS tests are required before release.

Deployment setup is documented in `docs/deployment.md`. Local Turnstile submissions and staff persistence work; the owner reported both SQL suites passed (35 access and 23 reliability checks). Hosted verification follows deployment. See `docs/public-submissions.md` and `docs/turnstile.md` for setup. No medical records, clinical advice, payments, or appointment scheduling. See `docs/project-brief.md` for scope.

Auth implementation follows https://supabase.com/docs/guides/auth/server-side/creating-a-client .
