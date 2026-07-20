export default function sitemap() {
    const baseUrl = 'https://khelopatna.in';

    // Static pages with fixed ISO dates to optimize crawling freshness signals
    const staticPages = [
        {
            url: baseUrl,
            lastModified: '2026-07-20',
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/book`,
            lastModified: '2026-07-20',
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/football-turf`,
            lastModified: '2026-07-20',
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/cricket-turf`,
            lastModified: '2026-07-20',
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/academy`,
            lastModified: '2026-07-20',
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: '2026-07-20',
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: '2026-07-20',
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/enquiry`,
            lastModified: '2026-07-20',
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/review`,
            lastModified: '2026-07-20',
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/academy/pay-fees`,
            lastModified: '2026-07-20',
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: '2026-07-20',
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: '2026-07-20',
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    return staticPages;
}
