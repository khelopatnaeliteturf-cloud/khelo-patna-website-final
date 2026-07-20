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
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/book.html', destination: '/book', permanent: true },
      { source: '/book-now.html', destination: '/book', permanent: true },
      { source: '/booking.html', destination: '/book', permanent: true },
      { source: '/cricket-turf.html', destination: '/cricket-turf', permanent: true },
      { source: '/football-turf.html', destination: '/football-turf', permanent: true },
      { source: '/checkout.html', destination: '/book', permanent: true },
      { source: '/enquiry.html', destination: '/enquiry', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
      { source: '/review.html', destination: '/review', permanent: true },
      { source: '/reviews.html', destination: '/review', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
      { source: '/terms.html', destination: '/terms', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/academy.html', destination: '/academy', permanent: true },
      { source: '/gallery.html', destination: '/about', permanent: true },
      { source: '/services.html', destination: '/', permanent: true },
      { source: '/pricing.html', destination: '/book', permanent: true }
    ];
  }
};

export default nextConfig;
