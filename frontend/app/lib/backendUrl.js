export function getBackendUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.hostname) {
        return `http://${window.location.hostname}:5001`;
    }

    return 'http://localhost:5001';
}
