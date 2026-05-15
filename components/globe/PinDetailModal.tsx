'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicEventPin } from '@/types/pins';
import { PIN_TYPES } from '@/config/pinTypes';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'offensive', label: 'Rahatsız edici' },
  { key: 'wrong_location', label: 'Yanlış konum' },
  { key: 'personal_data', label: 'Kişisel veri' },
  { key: 'other', label: 'Diğer' },
] as const;

type Props = {
  pin: PublicEventPin;
  onClose: () => void;
};

export function PinDetailModal({ pin, onClose }: Props) {
  const config = PIN_TYPES[pin.pin_type] ?? PIN_TYPES.general;
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const truncateNote = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + '…';
  };

  const submitReport = async () => {
    if (!reportReason) return;
    setReportLoading(true);
    setReportResult('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setReportResult('Giriş yapmanız gerekiyor.');
      setReportLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/pins/${pin.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason, message: reportMessage || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReportResult(data.error ?? 'Hata oluştu.');
      } else {
        setReportResult('Rapor gönderildi.');
        setTimeout(() => {
          setShowReport(false);
          setReportResult('');
        }, 1500);
      }
    } catch {
      setReportResult('Bağlantı hatası.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 md:absolute md:inset-auto md:right-6 md:top-6 md:block md:p-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-[28px] border border-white/14 bg-[rgba(15,23,42,0.82)] p-7 text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-[22px)] md:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-sm text-white/60 transition hover:bg-white/15 hover:text-white"
        >
          ×
        </button>

        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-4xl"
            style={{
              background: `linear-gradient(135deg, ${config.color}22, ${config.color}08)`,
              boxShadow: `0 0 24px ${config.glow}`,
            }}
          >
            {config.emoji}
          </div>
          <div>
            <h2 className="text-xl font-bold">{pin.display_name}</h2>
            <p className="mt-1 text-sm text-white/60">
              {pin.city}, {pin.country}
            </p>
          </div>
        </div>

        {pin.note ? (
          <p className="mb-5 text-sm leading-7 text-white/86 italic">
            &ldquo;{truncateNote(pin.note, 200)}&rdquo;
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: `${config.color}40`,
              color: config.color,
              background: `${config.color}15`,
            }}
          >
            <span>{config.emoji}</span>
            {config.label}
          </span>
        </div>

        <p className="mt-4 text-[11px] text-white/40">
          19 Mayıs Atatürk&apos;ü Anma, Gençlik ve Spor Bayramı
        </p>

        {!showReport ? (
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="mt-3 text-[11px] text-white/30 transition hover:text-white/50"
          >
            Şikayet et
          </button>
        ) : (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs text-white/60">Şikayet nedeni:</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReportReason(r.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    reportReason === r.key
                      ? 'border-red-400/40 bg-red-500/15 text-red-300'
                      : 'border-white/10 text-white/50 hover:bg-white/8'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              placeholder="Ek açıklama (opsiyonel)"
              maxLength={200}
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-white outline-none ring-white/20 focus:ring-1"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReport}
                disabled={reportLoading || !reportReason}
                className="rounded-full bg-red-600/80 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
              >
                Gönder
              </button>
              <button
                type="button"
                onClick={() => { setShowReport(false); setReportResult(''); }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/50"
              >
                İptal
              </button>
            </div>
            {reportResult ? (
              <p className="mt-2 text-[11px] text-white/60">{reportResult}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
