import { getSupabaseService } from '@/lib/supabase/service';
import type { EventPin } from '@/types/pins';
import { AdminPinActions } from '@/components/admin/AdminPinActions';

export const dynamic = 'force-dynamic';

function maskEmail(email: string | null | undefined) {
  if (!email) return '-';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${phone.slice(0, 3)} *** **${digits.slice(-2)}`;
}

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
              <div className="mt-3 text-xs text-white/60">
                Email: {maskEmail(pin.contact_email)}
              </div>
              <div className="mt-1 text-xs text-white/60">
                Telefon: {maskPhone(pin.contact_phone)}
              </div>
              <AdminPinActions pinId={pin.id} />
            </div>
          ))
        )}
      </div>
    </main>
  );
}
