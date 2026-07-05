import { NextResponse } from 'next/server';

/**
 * Server-side gate for the admin area.
 *
 * The real JWT lives in an httpOnly cookie on the backend origin, which this
 * middleware cannot read in split-domain deployments. Instead, the login page
 * sets a lightweight `kp_session` marker cookie on the frontend domain after
 * a successful login. This middleware redirects unauthenticated visitors to
 * /login before the admin shell ever renders (no more client-side flash).
 *
 * This is a UX gate, not a security boundary — every API request is still
 * authenticated and authorized by the backend.
 */
export function middleware(request) {
    const { pathname } = request.nextUrl;

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

export const config = {
    matcher: ['/admin/:path*', '/admin']
};
