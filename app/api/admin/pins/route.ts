import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

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

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', { uid: userData.user.id });

  if (adminError || !isAdmin) {
    return NextResponse.json({ error: 'Bu alana erişim yetkiniz yok.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('event_pins')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pins: data ?? [] });
}
