const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerifyResult = {
  success: boolean;
  'error-codes'?: string[];
};

export async function verifyTurnstileToken(token: string, remoteIp: string) {
  const secret = process.env.CF_TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, error: 'Turnstile secret key eksik.' };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    return { ok: false, error: 'Captcha dogrulamasi servis hatasi.' };
  }

  const data = (await response.json()) as TurnstileVerifyResult;
  if (!data.success) {
    const errorCode = data['error-codes']?.[0] ?? 'invalid-token';
    return { ok: false, error: `Captcha dogrulamasi basarisiz: ${errorCode}` };
  }

  return { ok: true, error: null };
}
