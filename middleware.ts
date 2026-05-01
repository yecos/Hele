import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for auth routes — critical for OAuth callbacks
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Security headers for all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');

  // CSP — allow Google OAuth form submissions
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
      "form-action 'self' https://accounts.google.com",
    ].join('; ')
  );

  // Auth check only for API routes (except public ones)
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');

  if (isApiRoute && !isPublicRoute) {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });
      
      // If no token, check for legacy header auth
      if (!token) {
        const adminAuth = request.headers.get('x-admin-auth');
        const authHeader = request.headers.get('authorization');
        
        if (!adminAuth && !authHeader) {
          return NextResponse.json(
            { success: false, error: 'Autenticación requerida' },
            { status: 401 }
          );
        }
      }
    } catch {
      // Token verification failed but might have header auth — let it through
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|logo|icon|manifest|sw.js|cast-receiver|offline).*)',
  ],
};
