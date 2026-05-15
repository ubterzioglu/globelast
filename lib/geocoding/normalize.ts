export function normalizeLocationInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function createQueryKey(city: string, country: string) {
  return `${normalizeLocationInput(city)}|${normalizeLocationInput(country)}`;
}
