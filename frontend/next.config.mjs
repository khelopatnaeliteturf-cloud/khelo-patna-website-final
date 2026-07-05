/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    // Proxy /api/* to the Express backend so the browser can talk same-origin
    // (no CORS, works in the v0 preview and local dev). In production you can
    // either keep this proxy (set BACKEND_INTERNAL_URL) or bypass it entirely
    // by setting NEXT_PUBLIC_BACKEND_URL to the backend's public URL.
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5001';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
