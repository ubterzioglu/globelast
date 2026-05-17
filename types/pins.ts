import type { PinType } from '@/config/pinTypes';

export type PinStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export type EventPin = {
  id: string;
  user_id: string | null;
  guest_device_fingerprint_hash: string | null;
  event_key: string;
  display_name: string;
  city: string;
  country: string;
  note: string;
  contact_email: string;
  contact_phone: string | null;
  lat: number;
  lng: number;
  pin_type: PinType;
  geocode_provider: string;
  geocode_display_name: string | null;
  status: PinStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  moderation_note: string | null;
  last_submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicEventPin = Pick<
  EventPin,
  | 'id'
  | 'display_name'
  | 'city'
  | 'country'
  | 'note'
  | 'lat'
  | 'lng'
  | 'pin_type'
  | 'event_key'
  | 'created_at'
>;

export type PublicPin = PublicEventPin;

export type GeocodeCandidate = {
  provider: 'nominatim' | 'google' | 'manual';
  displayName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  confidence?: number;
};
