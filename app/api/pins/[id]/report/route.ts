import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

const VALID_REASONS = ['spam', 'offensive', 'wrong_location', 'personal_data', 'other'] as const;
const AUTO_HIDE_THRESHOLD = 3;

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const reason = (body.reason as string ?? '').trim();
  if (!VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json({ error: 'Geçersiz rapor nedeni.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? (body.message as string).trim() : null;

  const { data: existingPin } = await supabase
    .from('event_pins')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!existingPin) {
    return NextResponse.json({ error: 'Pin bulunamadı.' }, { status: 404 });
  }

  const { error: insertError } = await supabase.from('pin_reports').insert({
    pin_id: id,
    reporter_user_id: userId,
    reason,
    message,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Bu pini zaten raporladın.' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { count } = await supabase
    .from('pin_reports')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', id);

  if (count && count >= AUTO_HIDE_THRESHOLD) {
    await supabase
      .from('event_pins')
      .update({
        status: 'hidden',
        moderated_at: new Date().toISOString(),
        moderation_note: `Otomatik gizlendi — ${count} rapor.`,
      })
      .eq('id', id);
  }

  return NextResponse.json({ success: true, message: 'Rapor gönderildi.' });
}
