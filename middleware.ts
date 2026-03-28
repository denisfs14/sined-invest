import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES  = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/verify'];
const ADMIN_ROUTES   = ['/admin'];
const PROTECTED_ROOT = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.'))
    return NextResponse.next();

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r));
  const isAdminRoute  = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isRootPath    = pathname === '/';
  let response        = NextResponse.next();

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

  if (isRootPath)
    return NextResponse.redirect(new URL(user ? PROTECTED_ROOT : '/auth/login', request.url));

  if (!isPublicRoute && !user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isPublicRoute && user && pathname !== '/auth/verify')
    return NextResponse.redirect(new URL(PROTECTED_ROOT, request.url));

  // Admin route — server-side role check (cannot be bypassed client-side)
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin')
      return NextResponse.redirect(new URL(PROTECTED_ROOT, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - /api/*        (API routes — must never be redirected by middleware)
     *
     * Explicitly excluding /api/ here is belt-and-suspenders alongside the
     * pathname.startsWith('/api') early-return inside the middleware function.
     * This ensures the Stripe webhook endpoint (/api/stripe/webhook) is never
     * intercepted by auth or locale redirect logic.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
