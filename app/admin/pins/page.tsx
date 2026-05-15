import { getSupabaseService } from '@/lib/supabase/service';
import type { EventPin } from '@/types/pins';

export const dynamic = 'force-dynamic';

async function getPendingPins(): Promise<EventPin[]> {
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('event_pins')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []) as EventPin[];
}

export default async function AdminPinsPage() {
  const pins = await getPendingPins();

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <h1 className="text-3xl font-bold">Pending Pins</h1>
      <p className="mt-2 text-sm text-white/60">{pins.length} bekleyen pin</p>
      <div className="mt-8 grid gap-4">
        {pins.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            Bekleyen pin yok.
          </div>
        ) : (
          pins.map((pin) => (
            <div key={pin.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="font-bold">{pin.display_name}</div>
              <div className="text-sm text-white/60">
                {pin.city}, {pin.country} · {pin.lat}, {pin.lng}
              </div>
              <p className="mt-3 text-sm">{pin.note}</p>
              <div className="mt-4 flex gap-3">
                <form action={`/api/admin/pins/${pin.id}/approve`} method="post">
                  <button className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold">
                    Approve
                  </button>
                </form>
                <form action={`/api/admin/pins/${pin.id}/reject`} method="post">
                  <button className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
