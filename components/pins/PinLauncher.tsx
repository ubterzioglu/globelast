'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { PinType } from '@/config/pinTypes';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { PinFormModal } from './PinFormModal';

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
  contact_phone?: string | null;
};

export function PinLauncher() {
  const MAX_PINS_PER_USER = 5;
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [existingPin, setExistingPin] = useState<ExistingPin | null>(null);
  const [pinCount, setPinCount] = useState(0);
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setExistingPin(null);
        setPinCount(0);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchMyPin = async () => {
      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) return;

      try {
        const response = await fetch('/api/pins/my', {
          headers: { authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setExistingPin(data.pin ?? null);
        setPinCount(Number(data.pinCount ?? 0));
      } catch {
        setExistingPin(null);
        setPinCount(0);
      }
    };

    fetchMyPin();
  }, [user]);

  const handleSubmitted = () => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: sessionData }) => {
      const token = sessionData.session?.access_token;
      if (!token) return;
      fetch('/api/pins/my', {
        headers: { authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setExistingPin(data.pin ?? null);
          setPinCount(Number(data.pinCount ?? 0));
        })
        .catch(() => {});
    });
  };

  const isUserLimitReached = !!user && pinCount >= MAX_PINS_PER_USER;

  return (
    <div className="absolute right-4 top-4 z-30 md:right-6 md:top-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isUserLimitReached}
        className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-2xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 md:px-5 md:py-3 md:text-sm"
      >
        {user ? `Kendini Pinle (${pinCount}/${MAX_PINS_PER_USER})` : 'Kendini Pinle'}
      </button>
      <PinFormModal
        open={open}
        onClose={() => setOpen(false)}
        user={user}
        existingPin={existingPin}
        pinCount={pinCount}
        maxPins={MAX_PINS_PER_USER}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
