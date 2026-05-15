import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';
import { validatePinPayload } from '@/lib/validation/pinValidation';

const COOLDOWN_MS = 5 * 60 * 1000;

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
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

  const { data: existingPin, error: fetchError } = await supabase
    .from('event_pins')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existingPin) {
    return NextResponse.json({ error: 'Pin bulunamadı.' }, { status: 404 });
  }

  if (existingPin.user_id !== userId) {
    return NextResponse.json({ error: 'Bu pini düzenleme yetkiniz yok.' }, { status: 403 });
  }

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

  const { error: updateError } = await supabase
    .from('event_pins')
    .update({
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
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Pin güncellendi. Onaydan sonra globe üzerinde görünecek.' });
}
