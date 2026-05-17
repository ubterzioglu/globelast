import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';
import type { PinStatus } from '@/types/pins';

type Context = {
  params: Promise<{ id: string }>;
};

const ALLOWED_STATUSES: PinStatus[] = ['pending', 'approved', 'rejected', 'hidden'];

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
    return NextResponse.json({ error: 'Gecersiz oturum.' }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: userData.user.id });

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
  }

  let body: { status?: PinStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek.' }, { status: 400 });
  }

  const nextStatus = body.status;
  if (!nextStatus || !ALLOWED_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: 'Gecersiz status.' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
    moderated_at: nowIso,
    moderated_by: userData.user.id,
  };

  if (nextStatus === 'approved') {
    updatePayload.approved_by = userData.user.id;
    updatePayload.approved_at = nowIso;
  } else {
    updatePayload.approved_by = null;
    updatePayload.approved_at = null;
  }

  const { error } = await supabase
    .from('event_pins')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
