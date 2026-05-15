'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { GeocodeCandidate } from '@/types/pins';
import type { PinType } from '@/config/pinTypes';
import { PIN_TYPES, PIN_TYPE_OPTIONS } from '@/config/pinTypes';

type ExistingPin = {
  id: string;
  display_name: string;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
  pin_type: PinType;
  status: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
  existingPin?: ExistingPin | null;
  onSubmitted?: () => void;
};

type FormState = {
  displayName: string;
  country: string;
  city: string;
  note: string;
  pinType: PinType;
};

export function PinFormModal({ open, onClose, user, existingPin, onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>({
    displayName: existingPin?.display_name ?? user.user_metadata?.full_name ?? '',
    country: existingPin?.country ?? '',
    city: existingPin?.city ?? '',
    note: existingPin?.note ?? '',
    pinType: existingPin?.pin_type ?? 'greeting',
  });
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(
    existingPin ? { provider: 'manual', displayName: '', city: existingPin.city, country: existingPin.country, lat: existingPin.lat, lng: existingPin.lng } : null
  );
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

    if (form.note.length > 0 && (form.note.length < 3 || form.note.length > 180)) {
      setMessage('Not 3-180 karakter arasında olmalı.');
      return;
    }

    setLoading(true);
    setMessage('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMessage('Oturum bulunamadı. Lütfen tekrar giriş yap.');
      setLoading(false);
      return;
    }

    const payload = {
      display_name: form.displayName.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      note: form.note.trim(),
      lat: selected.lat,
      lng: selected.lng,
      pin_type: form.pinType,
      geocode_provider: selected.provider,
      geocode_display_name: selected.displayName,
    };

    try {
      let response: Response;

      if (existingPin) {
        response = await fetch(`/api/pins/${existingPin.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/pins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? 'Bir hata oluştu.');
        setLoading(false);
        return;
      }

      setMessage(data.message ?? 'Pin gönderildi.');
      setLoading(false);
      onSubmitted?.();
      setTimeout(() => onClose(), 1500);
    } catch {
      setMessage('Bağlantı hatası. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#080a12] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {existingPin ? 'Pinini Güncelle' : 'Kendini Pinle'}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Şehir ve ülke bilgini yaz. Sistem doğru koordinatı bulsun.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-white/60 hover:text-white">
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-white/55 uppercase tracking-wider">Pin Türü</p>
          <div className="grid grid-cols-5 gap-2">
            {PIN_TYPE_OPTIONS.map((pt) => {
              const config = PIN_TYPES[pt];
              const isActive = form.pinType === pt;
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() => update('pinType', pt)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${
                    isActive
                      ? 'border-white/30 bg-white/12 shadow-[0_0_16px_var(--glow)]'
                      : 'border-white/8 bg-white/4 hover:bg-white/8'
                  }`}
                  style={isActive ? { '--glow': config.glow } as React.CSSProperties : undefined}
                >
                  <span className="text-xl">{config.emoji}</span>
                  <span className="text-[10px] leading-tight text-white/80">{config.shortLabel}</span>
                </button>
              );
            })}
          </div>
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
          <div className="relative">
            <textarea
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              placeholder="Kısa notun. Maksimum 180 karakter. Link ve HTML kullanılamaz."
              maxLength={180}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
            />
            <span className={`absolute bottom-3 right-4 text-xs ${form.note.length > 180 ? 'text-red-400' : 'text-white/40'}`}>
              {form.note.length}/180
            </span>
          </div>
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
            {existingPin ? 'Pinimi Güncelle' : 'Pinimi Gönder'}
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
