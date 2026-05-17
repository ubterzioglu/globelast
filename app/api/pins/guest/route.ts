import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { validatePinPayload } from '@/lib/validation/pinValidation';
import {
  getAbuseWindowStarts,
  getClientIp,
  getDeviceFingerprint,
  getDeviceMissingMessage,
  getGuestAbuseLimits,
  hashValue,
  isValidPhone,
  normalizePhone,
} from '@/lib/abuse';
import { verifyTurnstileToken } from '@/lib/security/turnstile';

const EVENT_KEY = '19-mayis-2026';
const GUEST_EMAIL = 'guest@anon.local';

export async function POST(request: Request) {
  const supabase = getSupabaseService();

  const deviceFingerprint = getDeviceFingerprint(request);
  const clientIp = getClientIp(request);
  if (!deviceFingerprint || !clientIp) {
    return NextResponse.json({ error: getDeviceMissingMessage() }, { status: 400 });
  }

  const deviceFingerprintHash = hashValue(deviceFingerprint);
  const ipHash = hashValue(clientIp);
  const { dayStartIso, hourStartIso } = getAbuseWindowStarts();
  const { deviceDailyLimit, ipHourlyLimit, cooldownSeconds } = getGuestAbuseLimits();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek.' }, { status: 400 });
  }

  const turnstileToken = String(body.turnstile_token ?? '').trim();
  if (!turnstileToken) {
    return NextResponse.json({ error: 'Captcha dogrulamasi zorunlu.' }, { status: 400 });
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileResult.ok) {
    return NextResponse.json({ error: turnstileResult.error }, { status: 401 });
  }

  const result = validatePinPayload({
    display_name: (body.display_name as string) ?? '',
    city: (body.city as string) ?? '',
    country: (body.country as string) ?? '',
    note: (body.note as string) ?? '',
    lat: Number(body.lat),
    lng: Number(body.lng),
    pin_type: (body.pin_type as string) ?? '',
    contact_phone: normalizePhone((body.contact_phone as string) ?? ''),
  });

  if (!result.valid || !result.sanitize) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!isValidPhone(result.sanitize.contact_phone ?? '')) {
    return NextResponse.json({ error: 'Telefon numarasi formati gecersiz.' }, { status: 400 });
  }

  const { count: deviceAttempts } = await supabase
    .from('pin_submission_logs')
    .select('*', { count: 'exact', head: true })
    .eq('device_fingerprint_hash', deviceFingerprintHash)
    .gte('created_at', dayStartIso);

  if ((deviceAttempts ?? 0) >= deviceDailyLimit) {
    return NextResponse.json(
      { error: 'Gunluk cihaz pin limitine ulastiniz. Yarin tekrar deneyin.' },
      { status: 429 }
    );
  }

  const { count: ipAttempts } = await supabase
    .from('pin_submission_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourStartIso);

  if ((ipAttempts ?? 0) >= ipHourlyLimit) {
    return NextResponse.json(
      { error: 'Bu agdan cok fazla deneme yapildi. Lutfen daha sonra tekrar deneyin.' },
      { status: 429 }
    );
  }

  const { data: recentGuestPin } = await supabase
    .from('event_pins')
    .select('id, status, last_submitted_at')
    .eq('event_key', EVENT_KEY)
    .eq('guest_device_fingerprint_hash', deviceFingerprintHash)
    .order('last_submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentGuestPin?.last_submitted_at) {
    const elapsedMs = Date.now() - new Date(recentGuestPin.last_submitted_at).getTime();
    const cooldownMs = cooldownSeconds * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return NextResponse.json(
        { error: `Lutfen ${remainingSec} saniye bekleyip tekrar deneyin.` },
        { status: 429 }
      );
    }
  }

  if (recentGuestPin) {
    if (recentGuestPin.status === 'rejected') {
      const { error: updateError } = await supabase
        .from('event_pins')
        .update({
          display_name: result.sanitize.display_name,
          city: result.sanitize.city,
          country: result.sanitize.country,
          note: result.sanitize.note,
          contact_email: GUEST_EMAIL,
          contact_phone: result.sanitize.contact_phone,
          lat: result.sanitize.lat,
          lng: result.sanitize.lng,
          pin_type: result.sanitize.pin_type,
          geocode_provider: (body.geocode_provider as string) ?? 'manual',
          geocode_display_name: (body.geocode_display_name as string) ?? null,
          status: 'pending',
          rejection_reason: null,
          moderated_at: null,
          moderated_by: null,
          approved_at: null,
          approved_by: null,
          last_submitted_at: new Date().toISOString(),
        })
        .eq('id', recentGuestPin.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await supabase.from('pin_submission_logs').insert({
        user_id: null,
        event_key: EVENT_KEY,
        device_fingerprint_hash: deviceFingerprintHash,
        ip_hash: ipHash,
        action: 'update',
      });

      return NextResponse.json({
        success: true,
        message: 'Reddedilen pin yeniden gonderildi. Onaydan sonra globe uzerinde gorunecek.',
      });
    }

    return NextResponse.json(
      { error: 'Bu etkinlik icin bu cihazdan zaten bir pin gonderildi.' },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase.from('event_pins').insert({
    user_id: null,
    guest_device_fingerprint_hash: deviceFingerprintHash,
    event_key: EVENT_KEY,
    display_name: result.sanitize.display_name,
    city: result.sanitize.city,
    country: result.sanitize.country,
    note: result.sanitize.note,
    contact_email: GUEST_EMAIL,
    contact_phone: result.sanitize.contact_phone,
    lat: result.sanitize.lat,
    lng: result.sanitize.lng,
    pin_type: result.sanitize.pin_type,
    geocode_provider: (body.geocode_provider as string) ?? 'manual',
    geocode_display_name: (body.geocode_display_name as string) ?? null,
    status: 'pending',
    last_submitted_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Bu etkinlik icin bu cihazdan zaten bir pin gonderildi.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from('pin_submission_logs').insert({
    user_id: null,
    event_key: EVENT_KEY,
    device_fingerprint_hash: deviceFingerprintHash,
    ip_hash: ipHash,
    action: 'create',
  });

  return NextResponse.json({
    success: true,
    message: 'Pin gonderildi. Onaydan sonra globe uzerinde gorunecek.',
  });
}
