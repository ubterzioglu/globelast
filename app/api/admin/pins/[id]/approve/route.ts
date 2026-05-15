import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const supabase = getSupabaseService();

  const { error } = await supabase
    .from('event_pins')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/admin/pins', _request.url));
}
