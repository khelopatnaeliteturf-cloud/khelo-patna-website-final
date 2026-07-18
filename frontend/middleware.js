import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

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
