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
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'user' | 'guest'>('all');
  const [query, setQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleStatusChanged = (pinId: string, nextStatus: PinStatus) => {
    setPins((prev) =>
      prev.map((pin) => (pin.id === pinId ? { ...pin, status: nextStatus } : pin))
    );
  };

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
      const ownerType = pin.user_id ? 'user' : 'guest';
      const ownerOk = ownerFilter === 'all' ? true : ownerType === ownerFilter;
      if (!ownerOk) return false;
      if (!normalizedQuery) return true;
      const haystack = `${pin.display_name} ${pin.city} ${pin.country} ${pin.note}`.toLocaleLowerCase('tr-TR');
      return haystack.includes(normalizedQuery);
    });
  }, [ownerFilter, pins, query, statusFilter]);

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
    <main className="min-h-screen bg-neutral-950 p-4 text-white md:p-8">
      <h1 className="text-2xl font-bold md:text-3xl">Admin - Pin Moderasyonu</h1>

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
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70 md:gap-3">
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
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Kaynak: Tum' },
              { key: 'user', label: 'Kaynak: User' },
              { key: 'guest', label: 'Kaynak: Guest' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setOwnerFilter(item.key as 'all' | 'user' | 'guest')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  ownerFilter === item.key
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
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:border-white/30 md:max-w-md"
            />
          </div>

          <p className="mt-3 text-sm text-white/60">
            {filteredPins.length} sonuc listeleniyor
          </p>
          {filteredPins.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
              Filtreye uygun pin yok.
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 md:hidden">
                {filteredPins.map((pin) => (
                  <div key={pin.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{pin.display_name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                          {pin.user_id ? 'user' : 'guest'}
                        </span>
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
                    </div>
                    <div className="mt-1 text-sm text-white/75">
                      {pin.city}, {pin.country}
                    </div>
                    <div className="text-xs text-white/45">{pin.lat}, {pin.lng}</div>
                    <p className="mt-2 text-sm text-white/80">{pin.note}</p>
                    <div className="mt-2 text-xs text-white/65">Email: {maskEmail(pin.contact_email)}</div>
                    <div className="text-xs text-white/65">Telefon: {maskPhone(pin.contact_phone)}</div>
                    <div className="mt-1 text-xs text-white/50">
                      Gonderim: {new Date(pin.created_at).toLocaleString('tr-TR')}
                    </div>
                    <div className="mt-3">
                      <AdminPinActions
                        pinId={pin.id}
                        currentStatus={pin.status}
                        onStatusChanged={(nextStatus) => handleStatusChanged(pin.id, nextStatus)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/5 md:block">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Ad Soyad</th>
                      <th className="px-4 py-3 font-semibold">Konum</th>
                      <th className="px-4 py-3 font-semibold">Not</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Telefon</th>
                      <th className="px-4 py-3 font-semibold">Gonderim</th>
                      <th className="px-4 py-3 font-semibold">Kaynak</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Islemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPins.map((pin) => (
                      <tr key={pin.id} className="border-t border-white/10 align-top">
                        <td className="px-4 py-3 font-semibold text-white">{pin.display_name}</td>
                        <td className="px-4 py-3 text-white/75">
                          {pin.city}, {pin.country}
                          <div className="text-xs text-white/45">
                            {pin.lat}, {pin.lng}
                          </div>
                        </td>
                        <td className="max-w-[320px] px-4 py-3 text-white/80">
                          <div className="line-clamp-3">{pin.note}</div>
                        </td>
                        <td className="px-4 py-3 text-white/70">{maskEmail(pin.contact_email)}</td>
                        <td className="px-4 py-3 text-white/70">{maskPhone(pin.contact_phone)}</td>
                        <td className="px-4 py-3 text-white/60">
                          {new Date(pin.created_at).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                            {pin.user_id ? 'user' : 'guest'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
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
                        </td>
                        <td className="px-4 py-3">
                          <AdminPinActions
                            pinId={pin.id}
                            currentStatus={pin.status}
                            onStatusChanged={(nextStatus) => handleStatusChanged(pin.id, nextStatus)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
