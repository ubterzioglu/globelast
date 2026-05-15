import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const supabase = getSupabaseService();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 });
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });
  }

  const { data: isAdmin } = await supabase
    .rpc('is_admin', { uid: userData.user.id });

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
  }

  const { error } = await supabase
    .from('event_pins')
    .update({
      status: 'approved',
      approved_by: userData.user.id,
      approved_at: new Date().toISOString(),
      moderated_at: new Date().toISOString(),
      moderated_by: userData.user.id,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect('/admin/pins');
}
