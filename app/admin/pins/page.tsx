'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { EventPin, PinStatus } from '@/types/pins';
import { AdminPinActions } from '@/components/admin/AdminPinActions';

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

export default function AdminPinsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pins, setPins] = useState<EventPin[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | PinStatus>('all');
  const [query, setQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    return pins.reduce(
      (acc, pin) => {
        acc.total += 1;
        acc[pin.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 }
    );
  }, [pins]);

  const filteredPins = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    return pins.filter((pin) => {
      const statusOk = statusFilter === 'all' ? true : pin.status === statusFilter;
      if (!statusOk) return false;
      if (!normalizedQuery) return true;
      const haystack = `${pin.display_name} ${pin.city} ${pin.country} ${pin.note}`.toLocaleLowerCase('tr-TR');
      return haystack.includes(normalizedQuery);
    });
  }, [pins, query, statusFilter]);

  const signInGoogle = async () => {
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/admin/pins')}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPins([]);
    setUserEmail(null);
  };

  useEffect(() => {
    const fetchAdminPins = async () => {
      setLoading(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const email = sessionData.session?.user?.email ?? null;
      setUserEmail(email);

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/pins', {
        headers: { authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? 'Admin verileri alınamadı.');
        setPins([]);
        setLoading(false);
        return;
      }

      setPins((data.pins ?? []) as EventPin[]);
      setLoading(false);
    };

    fetchAdminPins();
  }, [supabase]);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <h1 className="text-3xl font-bold">Admin - Pin Moderasyonu</h1>

      {!userEmail ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/75">Admin panelini kullanmak icin Google ile giris yap.</p>
          <button
            type="button"
            onClick={signInGoogle}
            className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-xl transition hover:scale-[1.02]"
          >
            Google ile giris yap
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3 text-sm text-white/70">
          <span>Oturum: {userEmail}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            Cikis yap
          </button>
        </div>
      )}

      {loading ? <p className="mt-4 text-sm text-white/65">Yukleniyor...</p> : null}
      {!loading && error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {!loading && !error && userEmail ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'all', label: `Tum (${statusCounts.total})` },
              { key: 'pending', label: `Pending (${statusCounts.pending})` },
              { key: 'approved', label: `Approved (${statusCounts.approved})` },
              { key: 'rejected', label: `Rejected (${statusCounts.rejected})` },
              { key: 'hidden', label: `Hidden (${statusCounts.hidden})` },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key as 'all' | PinStatus)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === item.key
                    ? 'border-white/35 bg-white/15 text-white'
                    : 'border-white/15 text-white/70 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Isim, sehir, ulke veya not ile ara..."
              className="w-full max-w-md rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:border-white/30"
            />
          </div>

          <p className="mt-3 text-sm text-white/60">
            {filteredPins.length} sonuc listeleniyor
          </p>
          <div className="mt-8 grid gap-4">
            {filteredPins.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
                Filtreye uygun pin yok.
              </div>
            ) : (
              filteredPins.map((pin) => (
                <div key={pin.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold">{pin.display_name}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        pin.status === 'approved'
                          ? 'bg-green-500/15 text-green-300'
                          : pin.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300'
                            : pin.status === 'rejected'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {pin.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {pin.city}, {pin.country} - {pin.lat}, {pin.lng}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Gonderim: {new Date(pin.created_at).toLocaleString('tr-TR')}
                  </div>
                  <p className="mt-3 text-sm">{pin.note}</p>
                  <div className="mt-3 text-xs text-white/60">Email: {maskEmail(pin.contact_email)}</div>
                  <div className="mt-1 text-xs text-white/60">Telefon: {maskPhone(pin.contact_phone)}</div>
                  {pin.status === 'pending' ? <AdminPinActions pinId={pin.id} /> : null}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
