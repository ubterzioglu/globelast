import type { GeocodeCandidate } from '@/types/pins';

export type GeocodeInput = {
  city: string;
  country: string;
  limit?: number;
};

export type Geocoder = {
  search(input: GeocodeInput): Promise<GeocodeCandidate[]>;
};
