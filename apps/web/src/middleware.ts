import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Protect /dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect /Founder routes
  if (pathname.startsWith('/Founder')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const secretKey = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only-corsaire';
      const key = new TextEncoder().encode(secretKey);
      const { payload } = await jwtVerify(sessionToken, key);
      if (payload.role !== 'Founder') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/Founder/:path*'],
};
