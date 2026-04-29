import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Anti-ad / security headers for all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');

  // CSP — restrict what can be loaded to prevent ad injections
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://cdn.jsdelivr.net",
      "frame-src 'self' https: http:",
      "img-src 'self' https: http: data: blob:",
      "media-src 'self' https: http: blob:",
      "connect-src 'self' https: http:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' https: data:",
      "child-src 'self' https: http:",
    ].join('; ')
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon|logo|icon|manifest|sw.js|cast-receiver|offline).*)',
  ],
};
