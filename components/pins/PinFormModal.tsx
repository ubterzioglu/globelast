'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { GeocodeCandidate } from '@/types/pins';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
};

type FormState = {
  displayName: string;
  country: string;
  city: string;
  note: string;
};

const initialForm: FormState = {
  displayName: '',
  country: '',
  city: '',
  note: '',
};

export function PinFormModal({ open, onClose, user }: Props) {
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    displayName: user.user_metadata?.full_name ?? '',
  });
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const findLocation = async () => {
    setLoading(true);
    setMessage('');
    setCandidates([]);
    setSelected(null);

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: form.city, country: form.country }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Konum bulunamadı.');
      }

      setCandidates(data.candidates ?? []);
      setMessage('Aşağıdan doğru konumu seç.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Konum aranırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async () => {
    if (!selected) {
      setMessage('Önce doğru konumu seçmelisin.');
      return;
    }

    setLoading(true);
    setMessage('');

    const supabase = getSupabaseBrowser();
    const payload = {
      user_id: user.id,
      display_name: form.displayName.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      note: form.note.trim(),
      lat: selected.lat,
      lng: selected.lng,
      geocode_provider: selected.provider,
      geocode_display_name: selected.displayName,
      status: 'pending' as const,
    };

    const { error } = await supabase.from('event_pins').insert(payload);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Pin gönderildi. Onaydan sonra globe üzerinde görünecek.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#080a12] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Kendini Pinle</h2>
            <p className="mt-1 text-sm text-white/60">
              Şehir ve ülke bilgini yaz. Sistem doğru koordinatı bulsun.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-white/60 hover:text-white">
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <input
            value={form.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            placeholder="Görünen ad"
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.country}
              onChange={(event) => update('country', event.target.value)}
              placeholder="Ülke, örn. Germany"
              className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
            />
            <input
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              placeholder="Şehir, örn. Dortmund"
              className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
            />
          </div>
          <textarea
            value={form.note}
            onChange={(event) => update('note', event.target.value)}
            placeholder="Kısa notun. Maksimum 240 karakter."
            maxLength={240}
            rows={4}
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={findLocation}
            disabled={loading}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            Konumu Bul
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={loading || !selected}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Pinimi Gönder
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-white/75">{message}</p> : null}

        {candidates.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={`${candidate.provider}-${candidate.lat}-${candidate.lng}`}
                onClick={() => setSelected(candidate)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selected === candidate
                    ? 'border-red-400 bg-red-500/18'
                    : 'border-white/10 bg-white/6 hover:bg-white/10'
                }`}
              >
                <div className="font-semibold">{candidate.displayName}</div>
                <div className="mt-1 text-xs text-white/55">
                  {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} · {candidate.provider}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
