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

export function createNominatimGeocoder(): Geocoder {
  return {
    async search(input: GeocodeInput) {
      const userAgent = process.env.NOMINATIM_USER_AGENT;

      if (!userAgent) {
        throw new Error('NOMINATIM_USER_AGENT is missing.');
      }

      const params = new URLSearchParams({
        q: `${input.city}, ${input.country}`,
        format: 'jsonv2',
        addressdetails: '1',
        limit: String(input.limit ?? 5),
      });

      const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: {
          'User-Agent': userAgent,
          Referer: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim failed with status ${response.status}.`);
      }

      const data = (await response.json()) as NominatimItem[];

      return data
        .map(toCandidate)
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    },
  };
}
