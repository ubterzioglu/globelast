import { createHash } from 'node:crypto';

const DEVICE_DAILY_LIMIT = Number(process.env.PIN_DEVICE_DAILY_LIMIT ?? 3);
const IP_HOURLY_LIMIT = Number(process.env.PIN_IP_HOURLY_LIMIT ?? 10);
const GUEST_DEVICE_DAILY_LIMIT = Number(process.env.PIN_GUEST_DEVICE_DAILY_LIMIT ?? 2);
const GUEST_IP_HOURLY_LIMIT = Number(process.env.PIN_GUEST_IP_HOURLY_LIMIT ?? 5);
const GUEST_COOLDOWN_SECONDS = Number(process.env.PIN_GUEST_COOLDOWN_SECONDS ?? 90);
const HASH_SALT = process.env.PIN_ABUSE_HASH_SALT ?? 'corteqs-default-salt-change-me';

export function hashValue(value: string) {
  return createHash('sha256').update(`${HASH_SALT}:${value}`).digest('hex');
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? '';
  }
  return (
    request.headers.get('x-real-ip')?.trim() ??
    request.headers.get('cf-connecting-ip')?.trim() ??
    ''
  );
}

export function getDeviceFingerprint(request: Request) {
  return request.headers.get('x-device-fingerprint')?.trim() ?? '';
}

export function getAbuseWindowStarts(now = new Date()) {
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);

  return {
    dayStartIso: dayStart.toISOString(),
    hourStartIso: hourStart.toISOString(),
  };
}

export function getAbuseLimits() {
  return {
    deviceDailyLimit: Number.isFinite(DEVICE_DAILY_LIMIT) ? DEVICE_DAILY_LIMIT : 3,
    ipHourlyLimit: Number.isFinite(IP_HOURLY_LIMIT) ? IP_HOURLY_LIMIT : 10,
  };
}

export function getGuestAbuseLimits() {
  return {
    deviceDailyLimit: Number.isFinite(GUEST_DEVICE_DAILY_LIMIT) ? GUEST_DEVICE_DAILY_LIMIT : 2,
    ipHourlyLimit: Number.isFinite(GUEST_IP_HOURLY_LIMIT) ? GUEST_IP_HOURLY_LIMIT : 5,
    cooldownSeconds: Number.isFinite(GUEST_COOLDOWN_SECONDS) ? GUEST_COOLDOWN_SECONDS : 90,
  };
}

export function normalizePhone(phone: string | undefined) {
  const value = (phone ?? '').trim();
  if (!value) return '';
  return value.replace(/[^\d+()\-\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function isValidPhone(phone: string) {
  if (!phone) return true;
  return /^\+?[0-9()\-\s]{7,20}$/.test(phone);
}

export function getDeviceMissingMessage() {
  return 'Cihaz doğrulaması alınamadı. Sayfayı yenileyip tekrar deneyin.';
}
