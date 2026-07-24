import { NextResponse } from 'next/server';

// Toggle site-wide maintenance mode: true = enabled (redirects to /maintenance), false = normal operation
const MAINTENANCE_MODE = false;

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Automatically route app.khelopatna.in domain directly to /app mobile interface
    if (hostname.includes('app.khelopatna.in') && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
        if (pathname !== '/app') {
            return NextResponse.rewrite(new URL('/app', request.url));
        }
    }

    // If maintenance mode is disabled, let all requests proceed normally
    if (!MAINTENANCE_MODE) {
        return NextResponse.next();
    }

    // Allow access to /maintenance page itself to prevent infinite loop
    if (pathname === '/maintenance') {
        return NextResponse.next();
    }

    // Allow static files, images, icons, and next internals to load
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') ||
        pathname.startsWith('/api')
    ) {
        return NextResponse.next();
    }

    // Bypass maintenance page for /admin and /login so management functions remain online
    if (pathname.startsWith('/admin') || pathname === '/login') {
        if (pathname.startsWith('/admin')) {
            const sessionMarker = request.cookies.get('kp_session');
            if (!sessionMarker) {
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('next', pathname);
                return NextResponse.redirect(loginUrl);
            }
        }
        return NextResponse.next();
    }

    // Rewrite all other public routes to the maintenance page
    return NextResponse.rewrite(new URL('/maintenance', request.url));
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
