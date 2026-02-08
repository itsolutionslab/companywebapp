import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { nextUrl: url, cookies } = request;

    // 1. Detect country from Vercel header or fallback
    const country = request.headers.get('x-vercel-ip-country') || 'US';
    const region = country.toUpperCase() === 'PE' ? 'pe' : 'us';

    const host = request.headers.get('host') || '';
    const isSubdomain = host.startsWith('solutions.brecomperu.com');

    // 2. Handle sub-domain routing for solutions.brecomperu.com
    if (isSubdomain) {
        // Rewrite root of subdomain to /admin
        if (url.pathname === '/') {
            return NextResponse.rewrite(new URL('/admin', request.url));
        }
        // If it doesn't already start with /admin, prefix it (unless it's an internal Next.js path)
        if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/_next') && !url.pathname.startsWith('/api')) {
            return NextResponse.rewrite(new URL(`/admin${url.pathname}`, request.url));
        }
    }

    // 3. Set region cookie if not present or different
    const response = NextResponse.next();
    const currentRegionCookie = cookies.get('NEXT_REGION')?.value;

    if (currentRegionCookie !== region) {
        response.cookies.set('NEXT_REGION', region, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
        });
    }

    // 3. Handle root path redirection
    if (url.pathname === '/') {
        return NextResponse.redirect(new URL(`/${region}`, request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images (public images)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
    ],
};
