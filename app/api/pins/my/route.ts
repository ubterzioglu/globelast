import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

const EVENT_KEY = '19-mayis-2026';

export async function GET(request: Request) {
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

  const { data, error } = await supabase
    .from('event_pins')
    .select('id, display_name, city, country, note, lat, lng, pin_type, status, event_key, created_at, updated_at, last_submitted_at')
    .eq('user_id', userId)
    .eq('event_key', EVENT_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pin: data ?? null });
}
