'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import type { PublicPin } from '@/types/pins';
import { fetchApprovedPins } from '@/lib/pins';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createLabel(pin: PublicPin) {
  return `
    <div style="padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.72);color:white;box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(12px);max-width:240px">
      <div style="font-weight:700;margin-bottom:4px">${escapeHtml(pin.display_name)}</div>
      <div style="opacity:.82;font-size:12px;margin-bottom:6px">${escapeHtml(pin.city)}, ${escapeHtml(pin.country)}</div>
      <div style="font-size:13px;line-height:1.35">${escapeHtml(pin.note)}</div>
    </div>
  `;
}

export default function PremiumGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [pins, setPins] = useState<PublicPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<PublicPin | null>(null);

  useEffect(() => {
    fetchApprovedPins()
      .then(setPins)
      .catch(() => setPins([]));
  }, []);

  useEffect(() => {
    const globe = globeRef.current;

    if (!globe) return;

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.35;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.05;
    globe.pointOfView({ lat: 39, lng: 35, altitude: 2.2 }, 1200);
  }, []);

  const points = useMemo(
    () =>
      pins.map((pin) => ({
        ...pin,
        label: createLabel(pin),
      })),
    [pins]
  );

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#03040a]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.12)_38%,rgba(0,0,0,.76)_100%)]" />

      <Globe
        ref={globeRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl="/globe/night-sky.png"
        globeImageUrl="/globe/earth-night.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        showAtmosphere
        atmosphereColor="#8cc8ff"
        atmosphereAltitude={0.22}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.055}
        pointRadius={0.22}
        pointResolution={24}
        pointColor={() => '#ff2d2d'}
        pointLabel="label"
        pointsTransitionDuration={900}
        onPointClick={(pin) => setSelectedPin(pin as PublicPin)}
      />

      <div className="pointer-events-none absolute left-6 top-6 z-20 max-w-xl rounded-3xl border border-white/10 bg-black/35 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
          19 Mayıs Global Türk Gençlik Haritası
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Dünyanın neresindesin?
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/72 md:text-base">
          Google ile giriş yap, şehrini seç, kısa notunu bırak. 19 Mayıs&apos;ta global haritada yerini al.
        </p>
      </div>

      <div className="absolute bottom-6 left-6 z-20 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 shadow-xl backdrop-blur-xl">
        <span className="font-semibold text-white">{pins.length}</span> onaylı pin yayında
      </div>

      {selectedPin ? (
        <div className="absolute bottom-6 right-6 z-30 max-w-sm rounded-3xl border border-white/10 bg-black/70 p-5 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSelectedPin(null)}
            className="absolute right-4 top-4 text-white/60 hover:text-white"
          >
            ×
          </button>
          <div className="pr-8 text-lg font-bold">{selectedPin.display_name}</div>
          <div className="mt-1 text-sm text-white/65">
            {selectedPin.city}, {selectedPin.country}
          </div>
          <p className="mt-4 text-sm leading-6 text-white/86">{selectedPin.note}</p>
        </div>
      ) : null}
    </div>
  );
}
