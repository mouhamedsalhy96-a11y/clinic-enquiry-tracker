# Vercel preview deployment

The app uses exact trusted HTTPS origins in production. `APP_ORIGIN` sets the stable app URL. On Vercel, the current deployment URL and branch URL are also accepted from Vercel's system environment variables. Request Host and X-Forwarded-Host never authorize an origin on their own.

## Required variables

The target Vercel environment requires:

- `NEXT_PUBLIC_SUPABASE_URL`: from `.env.local` (public).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public project key.
- `SUPABASE_SECRET_KEY`: server-only secret; store as a Secret.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public widget key, available at build time.
- `TURNSTILE_SECRET_KEY`: server-only secret; store as a Secret.
- `APP_ORIGIN`: the exact stable HTTPS app/branch URL, with no path.
- `PUBLIC_SUBMISSIONS_ENABLED`: `true` only when the deployment hostname is configured in Turnstile and the environment variables are installed. Unset or false keeps public saves closed.

Use Config for public values and settings, Secret for the two server keys. Do not upload `.env.local`, include secrets in command arguments, or put them in Git. `.gitignore` and `.vercelignore` exclude local environment files.

## Hosting and verification

Vercel uses the Next.js preset with framework-default build and output settings. Public submissions remain disabled until the deployment hostname is configured in Turnstile and the required environment is installed. `APP_ORIGIN` identifies the stable HTTPS origin. Public `NEXT_PUBLIC_` changes require a new build.

Hosted verification covers fictional submission and its reference, staff sign-in, status and note saves, refresh persistence, and sign-out. `/staff` must redirect after sign-out. Missing security tokens and foreign-origin writes must be rejected; anonymous database reads and direct submission RPC calls remain denied.

Password sign-in does not need a callback redirect URL. Configure Supabase's Site URL and any allowed redirects to the final app domain before adding password-reset/email links later.

The hosted app remains a fictional-data portfolio demonstration, not a clinical service. Access and reliability SQL tests passed in the development database. Hosted verification separately covers the form-to-inbox workflow and staff access.

References: https://vercel.com/docs/deployments/environments and https://vercel.com/docs/environment-variables/system-environment-variables
