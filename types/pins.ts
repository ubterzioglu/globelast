export type PinStatus = 'pending' | 'approved' | 'rejected';

export type EventPin = {
  id: string;
  user_id: string;
  event_key: string;
  display_name: string;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
  geocode_provider: string;
  geocode_display_name: string | null;
  status: PinStatus;
  created_at: string;
};

export type PublicPin = Pick<
  EventPin,
  | 'id'
  | 'display_name'
  | 'city'
  | 'country'
  | 'note'
  | 'lat'
  | 'lng'
  | 'created_at'
>;

export type GeocodeCandidate = {
  provider: 'nominatim' | 'google' | 'manual';
  displayName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  confidence?: number;
};
