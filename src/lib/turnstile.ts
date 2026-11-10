import "server-only";
export async function verifyTurnstile(token: unknown, hostname: string) {
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, status: 422, error: "Complete the security check before submitting." };
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 503, error: "Security verification is not configured yet. Your draft has been kept." };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!response.ok) return { ok: false, status: 503, error: "Security verification is unavailable. Retry the check without closing this form." };
    const result = await response.json();
    if (result.success !== true || result.hostname !== hostname || result.action !== "clinic_enquiry") {
      return { ok: false, status: 422, error: "The security check expired or was rejected. Complete the new check and retry." };
    }
    return { ok: true, status: 200, error: "" };
  } catch {
    return { ok: false, status: 503, error: "Security verification is unavailable. Retry the check without closing this form." };
  }
}

