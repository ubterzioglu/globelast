import type { GeocodeCandidate } from '@/types/pins';
import type { Geocoder, GeocodeInput } from './geocoder';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

type GoogleGeocodeResult = {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    types: string[];
  }>;
};

type GoogleGeocodeResponse = {
  status: string;
  results: GoogleGeocodeResult[];
  error_message?: string;
};

function findComponent(result: GoogleGeocodeResult, type: string) {
  return result.address_components?.find((item) => item.types.includes(type))?.long_name ?? '';
}

export function createGoogleGeocoder(): Geocoder {
  return {
    async search(input: GeocodeInput): Promise<GeocodeCandidate[]> {
      if (process.env.ENABLE_GOOGLE_GEOCODING !== 'true') {
        throw new Error('Google geocoding is disabled.');
      }

      const key = process.env.GOOGLE_GEOCODING_API_KEY;

      if (!key) {
        throw new Error('GOOGLE_GEOCODING_API_KEY is missing.');
      }

      const params = new URLSearchParams({
        address: `${input.city}, ${input.country}`,
        key,
      });

      const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Google geocoding failed with status ${response.status}.`);
      }

      const data = (await response.json()) as GoogleGeocodeResponse;

      if (data.status !== 'OK') {
        throw new Error(data.error_message ?? `Google geocoding status: ${data.status}`);
      }

      return data.results.slice(0, input.limit ?? 5).map((result) => ({
        provider: 'google',
        displayName: result.formatted_address,
        city:
          findComponent(result, 'locality') ||
          findComponent(result, 'postal_town') ||
          findComponent(result, 'administrative_area_level_2'),
        country: findComponent(result, 'country'),
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      }));
    },
  };
}
