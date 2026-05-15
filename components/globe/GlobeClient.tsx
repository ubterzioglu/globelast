'use client';

import dynamic from 'next/dynamic';

export const GlobeClient = dynamic(() => import('./PremiumGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#03040a] text-white/70">
      Globe yükleniyor...
    </div>
  ),
});
