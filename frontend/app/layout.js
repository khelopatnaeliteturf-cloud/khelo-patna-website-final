import "./globals.css";

export const metadata = {
  title: "KheloPatna Elite Turf — Patna's #1 Indoor Sports Arena",
  description: "Book premium indoor cricket & football turfs in Patna. Professional bowling machines, academy training, and smart slot scheduling. Play Elite, Play Patna.",
  keywords: "turf booking, indoor cricket, indoor football, Patna sports, KheloPatna, sports academy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
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
      </head>
      <body>
        {/* Ambient floating orbs — visible on all pages */}
        <div className="floating-orb floating-orb--1" aria-hidden="true"></div>
        <div className="floating-orb floating-orb--2" aria-hidden="true"></div>
        <div className="floating-orb floating-orb--3" aria-hidden="true"></div>
        {children}
      </body>
    </html>
  );
}
