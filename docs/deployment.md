# Vercel preview deployment

The app uses exact trusted HTTPS origins in production. `APP_ORIGIN` sets the stable app URL. On Vercel, the current deployment URL and branch URL are also accepted from Vercel's system environment variables. Request Host and X-Forwarded-Host never authorize an origin on their own.

## Required variables

Set these for the Preview environment in the new Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`: from `.env.local` (public).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public project key.
- `SUPABASE_SECRET_KEY`: server-only secret; store as a Secret.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public widget key, available at build time.
- `TURNSTILE_SECRET_KEY`: server-only secret; store as a Secret.
- `APP_ORIGIN`: the exact stable HTTPS app/branch URL, with no path.
- `PUBLIC_SUBMISSIONS_ENABLED`: `true` only when the deployment hostname is configured in Turnstile and the environment variables are installed. Unset or false keeps public saves closed.

Use Config for public values and settings, Secret for the two server keys. Do not upload `.env.local`, include secrets in command arguments, or put them in Git. `.gitignore` and `.vercelignore` exclude local environment files.

## Deployment sequence

1. Create a private GitHub repository and push `main`.
2. Import the repo into a new Vercel project using the Next.js preset. Add the variables in the dashboard. Keep public submissions disabled for the first build if the hostname is not ready.
3. Use a non-production Git branch for a preview, or deploy with the CLI without `--prod`. Retain Vercel's deployment protection while verifying.
4. Add the exact preview/branch hostname to the Turnstile widget. Avoid allowing every vercel.app hostname. For repeatable testing, use a stable branch URL rather than adding each unique deployment URL.
5. Set `APP_ORIGIN` to that stable URL, enable public submissions, and redeploy. Public NEXT_PUBLIC values require a new build.
6. Test a fictional submission, its confirmation reference, staff sign-in, status save, note save, refresh persistence and sign-out. Visit `/staff` after sign-out: it must redirect to login.
7. Test failure paths: missing security token must be rejected, foreign-origin writes must be rejected, and no anonymous database reads or direct RPC calls should become available.

Password sign-in does not need a callback redirect URL. Configure Supabase's Site URL and any allowed redirects to the final app domain before adding password-reset/email links later.

The hosted app remains a fictional-data portfolio demonstration, not a clinical service. Both access and reliability SQL tests have been reported as passed in the development database. Local automated checks do not prove a hosted deployment; record the deployed checks after the preview is available.

References: https://vercel.com/docs/deployments/environments and https://vercel.com/docs/environment-variables/system-environment-variables
