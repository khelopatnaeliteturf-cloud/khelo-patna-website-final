export function getBackendUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.hostname) {
        const { protocol, hostname } = window.location;
        // Local development: backend runs on port 5001 over http
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:5001`;
        }
        // Deployed without NEXT_PUBLIC_BACKEND_URL: match the page protocol to
        // avoid mixed-content blocking, and assume the API is on api.<domain>.
        // Set NEXT_PUBLIC_BACKEND_URL to override this.
        console.warn('[KheloPatna] NEXT_PUBLIC_BACKEND_URL is not set; falling back to api subdomain.');
        return `${protocol}//api.${hostname.replace(/^www\./, '')}`;
    }

    return 'http://localhost:5001';
}
