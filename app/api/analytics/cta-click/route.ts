import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const supabase = getSupabaseService();

  let body: { source?: string; path?: string };
  try {
    body = (await request.json()) as { source?: string; path?: string };
  } catch {
    body = {};
  }

  const { error } = await supabase.from('analytics_events').insert({
    event_name: 'outbound_cta_click',
    source: (body.source ?? 'unknown').slice(0, 80),
    path: (body.path ?? '').slice(0, 160),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

