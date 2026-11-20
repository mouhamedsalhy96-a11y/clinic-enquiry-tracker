# Turnstile integration

Database-backed public submissions require a Cloudflare Turnstile token. The sample form at `/demo/enquire` runs without Cloudflare.

## Configuration

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is the public widget key; `TURNSTILE_SECRET_KEY` is server-only. The widget hostname allowlist must include the app's exact hostname. Public configuration changes require a new build; server environment changes require a restart or redeployment.

## Verification flow

The server calls Siteverify before the submission function and requires success, the exact request hostname and action `clinic_enquiry`. Missing configuration, invalid or oversized tokens, wrong host/action, provider errors and an eight-second timeout fail closed. The verification request includes no visitor IP or enquiry text. The browser loads the widget directly.

After each save attempt, the token is cleared and the widget remounted. Draft fields and the request UUID remain so retries use a fresh challenge with database duplicate prevention. Expired or failed checks expose a retry control.

Automated tests mock provider responses. Live checks cover a successful save, its inbox reference, expired/failed challenges and draft preservation. Hosted saves also require the explicit submission enable switch and trusted-origin configuration.

References:
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
