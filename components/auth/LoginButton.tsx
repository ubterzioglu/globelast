'use client';

import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function LoginButton() {
  const login = async () => {
    const supabase = getSupabaseBrowser();
    const origin = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={login}
      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-xl transition hover:scale-[1.02]"
    >
      Google ile giriş yap
    </button>
  );
}
