export function getBackendUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    // Default: same-origin. Next.js rewrites (next.config.mjs) proxy /api/*
    // to the Express backend, which avoids CORS and mixed-content issues in
    // local dev, the v0 preview, and any deployment where the proxy is kept.
    // Set NEXT_PUBLIC_BACKEND_URL to call a separately-hosted backend directly.
    return '';
}
