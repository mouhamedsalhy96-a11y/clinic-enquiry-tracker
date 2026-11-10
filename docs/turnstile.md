# Turnstile setup and verification

The database-backed public form requires a Turnstile token. The sample form at `/demo/enquire` continues to work in memory without Cloudflare.

Add these variables to `.env.local`, keeping existing values:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-widget-site-key
TURNSTILE_SECRET_KEY=your-widget-secret-key
```

The site key is public. Keep the secret server-only, out of Git and out of chat. Restart `npm run dev` after changing either value. Use http://127.0.0.1:3000 and ensure that hostname is allowed on the widget.

The server calls Cloudflare Siteverify before invoking the submission function. It requires success plus the exact request hostname and action `clinic_enquiry`. Missing configuration, missing/oversized tokens, wrong host/action, rejection, provider errors and an eight-second timeout fail closed. No visitor IP or enquiry text is sent to Cloudflare by the verification request. The browser loads Cloudflare's widget directly.

The token is cleared and the widget remounted after each save attempt. Draft fields and the database request UUID remain, so a retry uses a fresh challenge and the database's existing duplicate prevention. Expired or failed checks can be retried using the button below the widget.

Manual check: complete the widget, submit fictional details, and confirm the saved reference appears in the staff inbox. Then repeat after a failed/expired check: the form must keep your draft and not save until verification succeeds. Do not paste verification tokens into chat. Automated tests use mocked provider responses; real widget verification remains pending until your keys are configured.

Production submissions remain locked. Deployment origin configuration, host allowlisting, retention and an end-to-end hosted verification are separate work.

References:
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
