import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PREFIXES = ['/190519idea', '/190519memory'] as const;

function getPrefix(pathname: string) {
  return PREFIXES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefix = getPrefix(pathname);

  if (!prefix) {
    return NextResponse.next();
  }

  const rewrittenPath = pathname.slice(prefix.length) || '/';
  const url = request.nextUrl.clone();
  url.pathname = rewrittenPath;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/190519idea/:path*', '/190519memory/:path*'],
};

