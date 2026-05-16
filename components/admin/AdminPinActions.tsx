'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

type Props = {
  pinId: string;
};

export function AdminPinActions({ pinId }: Props) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState('');

  const act = async (action: 'approve' | 'reject') => {
    setLoading(action);
    setMessage('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMessage('Oturum bulunamadı. Yeniden giriş yap.');
      setLoading(null);
      return;
    }

    const response = await fetch(`/api/admin/pins/${pinId}/${action}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? 'İşlem başarısız oldu.');
      setLoading(null);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => act('approve')}
          disabled={loading !== null}
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {loading === 'approve' ? 'Onaylanıyor...' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => act('reject')}
          disabled={loading !== null}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {loading === 'reject' ? 'Reddediliyor...' : 'Reject'}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-red-300">{message}</p> : null}
    </div>
  );
}

