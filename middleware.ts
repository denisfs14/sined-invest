import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES  = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/verify'];
const PROTECTED_ROOT = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) return NextResponse.next();

  const isPublicRoute    = PUBLIC_ROUTES.some(r => pathname.startsWith(r));
  const isRootPath       = pathname === '/';
  let   response         = NextResponse.next();

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Root → redirect based on auth state
  if (isRootPath) {
    return NextResponse.redirect(
      new URL(user ? PROTECTED_ROOT : '/auth/login', request.url)
    );
  }

  // Unauthenticated trying to access protected route
  if (!isPublicRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated trying to access auth pages
  if (isPublicRoute && user && pathname !== '/auth/verify') {
    return NextResponse.redirect(new URL(PROTECTED_ROOT, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
