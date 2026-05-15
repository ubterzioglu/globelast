import { PIN_TYPES } from '@/config/pinTypes';
import type { PinType } from '@/config/pinTypes';

export type PinPayload = {
  display_name: string;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
  pin_type: string;
};

const BLOCKED_LINK_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\.com/i,
  /\.net/i,
  /\.org/i,
  /\.io/i,
  /\.dev/i,
  /\.app/i,
  /\.co/i,
  /\.tr/i,
  /\.de/i,
  /\.uk/i,
];

export function containsBlockedLink(text: string): boolean {
  return BLOCKED_LINK_PATTERNS.some((pattern) => pattern.test(text));
}

export function containsHtmlLikeContent(text: string): boolean {
  return /<[^>]*>/g.test(text);
}

export function roundCoordinate(value: number): number {
  return Number(Number(value).toFixed(2));
}

export function validatePinPayload(payload: PinPayload): {
  valid: boolean;
  error: string | null;
  sanitize: {
    display_name: string;
    city: string;
    country: string;
    note: string;
    lat: number;
    lng: number;
    pin_type: PinType;
  } | null;
} {
  const displayName = (payload.display_name ?? '').trim();
  const city = (payload.city ?? '').trim();
  const country = (payload.country ?? '').trim();
  const note = (payload.note ?? '').trim();
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  const pinType = (payload.pin_type ?? '').trim();

  if (!(pinType in PIN_TYPES)) {
    return { valid: false, error: 'Geçersiz pin türü.', sanitize: null };
  }

  if (city.length < 2) {
    return { valid: false, error: 'Şehir en az 2 karakter olmalı.', sanitize: null };
  }

  if (country.length < 2) {
    return { valid: false, error: 'Ülke en az 2 karakter olmalı.', sanitize: null };
  }

  if (note.length < 3 || note.length > 180) {
    return { valid: false, error: 'Not 3-180 karakter arasında olmalı.', sanitize: null };
  }

  if (containsBlockedLink(note)) {
    return { valid: false, error: 'Not içinde link kullanılamaz.', sanitize: null };
  }

  if (containsHtmlLikeContent(note)) {
    return { valid: false, error: 'Not içinde HTML/script kullanılamaz.', sanitize: null };
  }

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: 'Enlem -90 ile 90 arasında olmalı.', sanitize: null };
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: 'Boylam -180 ile 180 arasında olmalı.', sanitize: null };
  }

  return {
    valid: true,
    error: null,
    sanitize: {
      display_name: displayName,
      city,
      country,
      note,
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng),
      pin_type: pinType as PinType,
    },
  };
}
