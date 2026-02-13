import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { nextUrl: url, cookies } = request;

    // 1. Detect country from Vercel header or fallback
    const country = request.headers.get('x-vercel-ip-country') || 'US';

    // 2. Detect preferred language from Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || '';
    const isSpanishPreferred = acceptLanguage.toLowerCase().includes('es');

    // 3. Determine target region based on language and country
    let region = 'us'; // Default
    if (isSpanishPreferred) {
        region = country.toUpperCase() === 'PE' ? 'pe' : 'latam';
    } else if (country.toUpperCase() === 'PE') {
        region = 'pe'; // If in Peru but language not specified/Spanish, default to PE
    }

    const host = request.headers.get('host') || '';
    const isSubdomain = host.startsWith('solutions.brecomperu.com') || host.startsWith('admin.');

    // 4. Handle sub-domain routing for solutions.brecomperu.com and admin.
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

    // 5. Handle root path redirection (Automatic Language Switching)
    if (url.pathname === '/') {
        return NextResponse.redirect(new URL(`/${region}`, request.url));
    }

    // 6. Set region cookie if not present or different (on non-root paths)
    const response = NextResponse.next();
    const currentRegionCookie = cookies.get('NEXT_REGION')?.value;

    // Determine region from path if possible for cookie consistency
    const pathRegion = url.pathname.split('/')[1];
    const finalRegion = ['us', 'pe', 'latam'].includes(pathRegion) ? pathRegion : region;

    if (currentRegionCookie !== finalRegion) {
        response.cookies.set('NEXT_REGION', finalRegion, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
        });
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
