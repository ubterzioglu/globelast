import { NextResponse } from 'next/server';
import { getGeocoder } from '@/lib/geocoding';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const city = clean(body.city);
    const country = clean(body.country);

    if (city.length < 2 || country.length < 2) {
      return NextResponse.json(
        { error: 'Şehir ve ülke alanları zorunludur.' },
        { status: 400 }
      );
    }

    const geocoder = getGeocoder();
    const candidates = await geocoder.search({ city, country, limit: 5 });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Konum bulunamadı. Şehir ve ülke bilgisini kontrol et.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown geocoding error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
