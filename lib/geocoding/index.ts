import { createNominatimGeocoder } from './nominatim';
import { createGoogleGeocoder } from './google';
import type { Geocoder } from './geocoder';

export function getGeocoder(): Geocoder {
  const provider = process.env.GEOCODER_PROVIDER ?? 'nominatim';

  if (provider === 'google') {
    return createGoogleGeocoder();
  }

  return createNominatimGeocoder();
}
