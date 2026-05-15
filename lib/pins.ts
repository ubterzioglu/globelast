import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { PublicPin } from '@/types/pins';

export async function fetchApprovedPins(eventKey = '19-mayis-2026') {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('event_pins')
    .select('id, display_name, city, country, note, lat, lng, created_at')
    .eq('event_key', eventKey)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PublicPin[];
}
