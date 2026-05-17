'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { PinStatus } from '@/types/pins';

type Props = {
  pinId: string;
  currentStatus: PinStatus;
  onStatusChanged?: (nextStatus: PinStatus) => void;
};

const STATUS_OPTIONS: { key: PinStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approve' },
  { key: 'rejected', label: 'Reject' },
  { key: 'hidden', label: 'Hide' },
];

export function AdminPinActions({ pinId, currentStatus, onStatusChanged }: Props) {
  const [loading, setLoading] = useState<PinStatus | null>(null);
  const [message, setMessage] = useState('');

  const act = async (nextStatus: PinStatus) => {
    setLoading(nextStatus);
    setMessage('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMessage('Oturum bulunamadı. Yeniden giriş yap.');
      setLoading(null);
      return;
    }

    const response = await fetch(`/api/admin/pins/${pinId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? 'İşlem başarısız oldu.');
      setLoading(null);
      return;
    }

    onStatusChanged?.(nextStatus);
    setLoading(null);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => act(opt.key)}
              disabled={loading !== null || isActive}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                isActive
                  ? 'border-white/40 bg-white/20 text-white'
                  : 'border-white/20 text-white/75 hover:bg-white/10'
              }`}
            >
              {loading === opt.key ? '...' : opt.label}
            </button>
          );
        })}
      </div>
      {message ? <p className="text-xs text-red-300">{message}</p> : null}
    </div>
  );
}
