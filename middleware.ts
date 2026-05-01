import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/health',
];

export async function middleware(request: NextRequest) {
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

  // Auth check for API routes (except public ones)
  const isPublicRoute = PUBLIC_ROUTES.some(route => request.nextUrl.pathname.startsWith(route));
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

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
          // For API routes, return 401 instead of redirecting
          return NextResponse.json(
            { success: false, error: 'Autenticación requerida' },
            { status: 401 }
          );
        }
      }
    } catch {
      // Token verification failed but might have header auth — let it through
      // The individual route handlers will verify with requireAdmin
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon|logo|icon|manifest|sw.js|cast-receiver|offline).*)',
  ],
};
