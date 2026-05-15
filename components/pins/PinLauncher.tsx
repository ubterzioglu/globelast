'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { LoginButton } from '@/components/auth/LoginButton';
import { PinFormModal } from './PinFormModal';

export function PinLauncher() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="absolute right-6 top-6 z-30">
      {user ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-2xl transition hover:scale-[1.02]"
          >
            Kendini Pinle
          </button>
          <PinFormModal open={open} onClose={() => setOpen(false)} user={user} />
        </>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}
