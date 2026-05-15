import type { GeocodeCandidate } from '@/types/pins';

export type GeocodeInput = {
  city: string;
  country: string;
  limit?: number;
  requestOrigin?: string;
};

export type Geocoder = {
  search(input: GeocodeInput): Promise<GeocodeCandidate[]>;
};
