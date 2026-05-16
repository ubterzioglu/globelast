'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const PATH_PREFIXES = ['/190519idea', '/190519memory'] as const;

function detectPrefix(pathname: string) {
  return PATH_PREFIXES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? '';
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const prefix = detectPrefix(window.location.pathname);
    supabase.auth.getSession().finally(() => {
      router.replace(`${prefix}/`);
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Giriş tamamlanıyor...
    </main>
  );
}
