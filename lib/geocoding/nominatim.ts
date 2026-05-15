import type { GeocodeCandidate } from '@/types/pins';
import type { Geocoder, GeocodeInput } from './geocoder';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
};

function toCandidate(item: NominatimItem): GeocodeCandidate {
  const city =
    item.address?.city ??
    item.address?.town ??
    item.address?.village ??
    item.address?.municipality ??
    '';

  return {
    provider: 'nominatim',
    displayName: item.display_name,
    city,
    country: item.address?.country ?? '',
    lat: Number(item.lat),
    lng: Number(item.lon),
    confidence: item.importance,
  };
}

function buildNominatimHeaders(requestOrigin?: string) {
  const configuredUserAgent = process.env.NOMINATIM_USER_AGENT?.trim();
  const referer =
    requestOrigin?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';
  const from = process.env.NOMINATIM_FROM_EMAIL?.trim();

  const userAgent =
    configuredUserAgent && configuredUserAgent.length > 0
      ? configuredUserAgent
      : `CorteqsGlobe/1.0 (${referer})`;

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Referer: referer,
  };

  if (from) {
    headers.From = from;
  }

  return headers;
}

export function createNominatimGeocoder(): Geocoder {
  return {
    async search(input: GeocodeInput) {
      const params = new URLSearchParams({
        q: `${input.city}, ${input.country}`,
        format: 'jsonv2',
        addressdetails: '1',
        limit: String(input.limit ?? 5),
      });

      const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: buildNominatimHeaders(input.requestOrigin),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            'Nominatim rejected the request with status 403. Check NOMINATIM_USER_AGENT, NOMINATIM_FROM_EMAIL, and the deployed site URL.'
          );
        }

        throw new Error(`Nominatim failed with status ${response.status}.`);
      }

      const data = (await response.json()) as NominatimItem[];

      return data
        .map(toCandidate)
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    },
  };
}
