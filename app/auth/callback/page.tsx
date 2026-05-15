'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().finally(() => {
      router.replace('/');
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Giriş tamamlanıyor...
    </main>
  );
}
