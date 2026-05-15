import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { validatePinPayload } from '@/lib/validation/pinValidation';

const COOLDOWN_MS = 5 * 60 * 1000;
const EVENT_KEY = '19-mayis-2026';

export async function POST(request: Request) {
  const supabase = getSupabaseService();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Giriş yapmanız gerekiyor.' }, { status: 401 });
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });
  }

  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const result = validatePinPayload({
    display_name: (body.display_name as string) ?? '',
    city: (body.city as string) ?? '',
    country: (body.country as string) ?? '',
    note: (body.note as string) ?? '',
    lat: Number(body.lat),
    lng: Number(body.lng),
    pin_type: (body.pin_type as string) ?? '',
  });

  if (!result.valid || !result.sanitize) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data: existingPin } = await supabase
    .from('event_pins')
    .select('id, last_submitted_at')
    .eq('user_id', userId)
    .eq('event_key', EVENT_KEY)
    .maybeSingle();

  if (existingPin) {
    return NextResponse.json(
      { error: 'Bu etkinlik için zaten bir pinin var. Güncellemek için düzenle.' },
      { status: 409 }
    );
  }

  const { data: recentPin } = await supabase
    .from('event_pins')
    .select('last_submitted_at')
    .eq('user_id', userId)
    .order('last_submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentPin?.last_submitted_at) {
    const lastSubmitted = new Date(recentPin.last_submitted_at).getTime();
    if (Date.now() - lastSubmitted < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (Date.now() - lastSubmitted)) / 1000);
      return NextResponse.json(
        { error: `Lütfen ${remainingSec} saniye bekleyip tekrar deneyin.` },
        { status: 429 }
      );
    }
  }

  const { error: insertError } = await supabase.from('event_pins').insert({
    user_id: userId,
    event_key: EVENT_KEY,
    display_name: result.sanitize.display_name,
    city: result.sanitize.city,
    country: result.sanitize.country,
    note: result.sanitize.note,
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
        { error: 'Bu etkinlik için zaten bir pinin var.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Pin gönderildi. Onaydan sonra globe üzerinde görünecek.' });
}
