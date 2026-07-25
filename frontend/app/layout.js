import "./globals.css";
import { poppins, montserrat, spaceGrotesk } from "./fonts";

export const viewport = {
  themeColor: "#10B981",
};

export const metadata = {
  title: "KheloPatna Elite Turf — #1 Cricket & Football Turf in Patna | Near Signature Sights",
  description: "Book premium indoor cricket nets & football turf in Patna. Professional cricket bowling machines, sports academy, and turf near me at Kumhrar near Signature Sights. Book hourly slots online!",
  keywords: "cricket, turf, turf in patna, signature sights, turf near me, cricket turf Patna, cricket nets Patna, football turf Patna, best turf in Patna, indoor cricket arena, cricket academy Patna, sports turf Kumhrar Patna",
  authors: [{ name: "KheloPatna" }],
  creator: "KheloPatna",
  publisher: "KheloPatna Elite Turf",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  metadataBase: new URL("https://khelopatna.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KheloPatna Elite Turf — #1 Cricket & Football Turf in Patna | Near Signature Sights",
    description: "Book premium indoor cricket nets & football turf in Patna. Professional bowling machines, academy training, and instant slot reservations near Signature Sights.",
    url: "https://khelopatna.in",
    siteName: "KheloPatna Elite Turf",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "KheloPatna Elite Turf - #1 Cricket & Football Turf in Patna Near Signature Sights",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KheloPatna Elite Turf — #1 Cricket & Football Turf in Patna | Near Signature Sights",
    description: "Book premium indoor cricket nets & football turf in Patna. Professional bowling machines, academy training, and instant slot reservations near Signature Sights.",
    images: ["/og-image.jpg"],
    creator: "@khelopatna",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "TVvk28Oxj6AyVBvjn9lAOCrPWX_jYtg5VkM9RbmFCXc",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true} className={`${poppins.variable} ${montserrat.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        />
        <meta name="theme-color" content="#040609" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "LocalBusiness",
                  "@id": "https://khelopatna.in/#localbusiness",
                  "name": "KheloPatna Elite Turf — Cricket & Football Arena",
                  "image": [
                    "https://khelopatna.in/logo.png",
                    "https://khelopatna.in/og-image.jpg"
                  ],
                  "telephone": "+919709701400",
                  "email": "service@khelopatna.in",
                  "url": "https://khelopatna.in",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Near Signature Sights, Sandalpur Road, Kumhrar, Near ICICI Bank",
                    "addressLocality": "Patna",
                    "addressRegion": "Bihar",
                    "postalCode": "800007",
                    "addressCountry": "IN"
                  },
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": 25.6000,
                    "longitude": 85.1800
                  },
                  "openingHoursSpecification": {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": [
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday"
                    ],
                    "opens": "06:00",
                    "closes": "23:00"
                  },
                  "keywords": "cricket, turf, turf in patna, signature sights, turf near me, cricket turf Patna, cricket nets Patna, football turf Patna",
                  "sameAs": [
                    "https://www.facebook.com/profile.php?id=61577271700289#",
                    "https://www.instagram.com/khelopatna_eliteturf",
                    "https://www.youtube.com/channel/UCbpgjXcAau9Z9UbCP9Ilbvw/"
                  ]
                },
                {
                  "@type": "SportsActivityLocation",
                  "@id": "https://khelopatna.in/#sportsarena",
                  "name": "KheloPatna Elite Turf Sports Arena",
                  "description": "#1 Turf in Patna for Cricket & Football near Signature Sights. Professional bowling machines, LED lights, and academy training.",
                  "url": "https://khelopatna.in",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Near Signature Sights, Sandalpur Road, Kumhrar",
                    "addressLocality": "Patna",
                    "addressRegion": "Bihar",
                    "postalCode": "800007",
                    "addressCountry": "IN"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className={poppins.className}>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="skip-link"
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: '#00FF88',
            color: '#030806',
            fontWeight: 700,
            fontSize: '0.9rem',
            borderRadius: '0 0 8px 8px',
            zIndex: 10000,
            textDecoration: 'none',
            transition: 'top 0.3s ease'
          }}
        >
          Skip to main content
        </a>
        {/* Ambient floating orbs — visible on all pages */}
        <div className="floating-orb floating-orb--1" aria-hidden="true"></div>
        <div className="floating-orb floating-orb--2" aria-hidden="true"></div>
        <div className="floating-orb floating-orb--3" aria-hidden="true"></div>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
