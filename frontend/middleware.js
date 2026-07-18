import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Allow access to /maintenance page itself
    if (pathname === '/maintenance') {
        return NextResponse.next();
    }

    // Allow static files, images, icons, and next internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') ||
        pathname.startsWith('/api')
    ) {
        return NextResponse.next();
    }

    // Redirect all other requests to the maintenance page
    return NextResponse.redirect(new URL('/maintenance', request.url));
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
