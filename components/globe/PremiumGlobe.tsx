'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import type { PublicEventPin } from '@/types/pins';
import { fetchApprovedPins } from '@/lib/pins';
import { PIN_TYPES } from '@/config/pinTypes';
import type { PinType } from '@/config/pinTypes';
import { PinDetailModal } from './PinDetailModal';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createLabel(pin: PublicEventPin) {
  const config = PIN_TYPES[pin.pin_type] ?? PIN_TYPES.general;
  const truncatedNote = pin.note.length > 90 ? pin.note.slice(0, 90) + '…' : pin.note;
  return `
    <div style="padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.72);color:white;box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(12px);max-width:240px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:16px">${config.emoji}</span>
        <span style="font-weight:700">${escapeHtml(pin.display_name)}</span>
      </div>
      <div style="opacity:.82;font-size:12px;margin-bottom:6px">${escapeHtml(pin.city)}, ${escapeHtml(pin.country)}</div>
      <div style="font-size:13px;line-height:1.35">${escapeHtml(truncatedNote)}</div>
    </div>
  `;
}

type FilterOption = 'all' | PinType;

const FILTER_OPTIONS: { key: FilterOption; emoji: string; label: string }[] = [
  { key: 'all', emoji: '🌐', label: 'Tümü' },
  { key: 'greeting', emoji: '🇹🇷', label: 'Selam' },
  { key: 'student', emoji: '🎓', label: 'Öğrenci' },
  { key: 'event', emoji: '📍', label: 'Etkinlik' },
  { key: 'family', emoji: '🏠', label: 'Aile' },
  { key: 'general', emoji: '🌍', label: 'Genel' },
];

export default function PremiumGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [pins, setPins] = useState<PublicEventPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<PublicEventPin | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');

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

  const visiblePins = useMemo(
    () => (filter === 'all' ? pins : pins.filter((p) => p.pin_type === filter)),
    [pins, filter]
  );

  const points = useMemo(
    () =>
      visiblePins.map((pin) => ({
        ...pin,
        label: createLabel(pin),
      })),
    [visiblePins]
  );

  const pinTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { total: pins.length };
    for (const pin of pins) {
      counts[pin.pin_type] = (counts[pin.pin_type] ?? 0) + 1;
    }
    return counts;
  }, [pins]);

  const getPointColor = (obj: object) => {
    const point = obj as (typeof points)[number];
    const config = PIN_TYPES[point.pin_type];
    return config?.color ?? PIN_TYPES.general.color;
  };

  const getPointRadius = (obj: object) => {
    const point = obj as (typeof points)[number];
    return selectedPin?.id === point.id ? 0.42 : 0.28;
  };

  const getPointAltitude = (obj: object) => {
    const point = obj as (typeof points)[number];
    return selectedPin?.id === point.id ? 0.035 : 0.015;
  };

  const handleCtaClick = () => {
    fetch('/api/analytics/cta-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'hero_cta',
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  };

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
        pointAltitude={getPointAltitude}
        pointRadius={getPointRadius}
        pointResolution={24}
        pointColor={getPointColor}
        pointLabel="label"
        pointsTransitionDuration={900}
        onPointClick={(pin) => setSelectedPin(pin as PublicEventPin)}
      />

      <div className="absolute left-6 top-6 z-20 max-w-xl rounded-3xl border border-white/10 bg-black/35 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
          19 Mayıs Atatürk&apos;ü Anma, Gençlik ve Spor Bayarmı
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Dünyanın neresindesin?
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/72 md:text-base">
          Kendini pinle! Çoşkuya katıl!
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a
            href="https://corteqs.net/19051919"
            target="_blank"
            rel="noreferrer"
            onClick={handleCtaClick}
            className="inline-flex w-fit rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            19 Mayıs Anını Paylaş !
          </a>
          <a
            href="https://corteqs.net/19051919"
            target="_blank"
            rel="noreferrer"
            onClick={handleCtaClick}
            className="inline-flex w-fit rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            19 Mayıs&apos;ı 19 Kelimeyle anlat!
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 shadow-xl backdrop-blur-xl">
          <span className="font-semibold text-white">{pins.length}</span> onaylı pin yayında
        </div>

        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 px-3 py-2 shadow-xl backdrop-blur-xl md:flex-wrap">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.key;
            const count = opt.key === 'all' ? pinTypeCounts.total : (pinTypeCounts[opt.key] ?? 0);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'border-white/25 bg-white/12 text-white'
                    : 'border-transparent text-white/60 hover:bg-white/8 hover:text-white/80'
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                <span className="text-white/40">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedPin ? <PinDetailModal pin={selectedPin} onClose={() => setSelectedPin(null)} /> : null}
    </div>
  );
}
