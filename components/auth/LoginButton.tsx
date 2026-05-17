'use client';

import { getSupabaseBrowser } from '@/lib/supabase/browser';

const PATH_PREFIXES = ['/190519idea', '/190519memory'] as const;

function detectPrefix(pathname: string) {
  return PATH_PREFIXES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? '';
}

export function LoginButton() {
  const login = async () => {
    const supabase = getSupabaseBrowser();
    const origin = window.location.origin;
    const prefix = detectPrefix(window.location.pathname);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}${prefix}/auth/callback`,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={login}
      className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-xl transition hover:scale-[1.02] md:px-5 md:py-3 md:text-sm"
    >
      Google ile giriş yap
    </button>
  );
}
