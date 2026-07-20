export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/', '/login', '/maintenance'],
            },
        ],
        sitemap: 'https://khelopatna.in/sitemap.xml',
        host: 'https://khelopatna.in',
    };
}
