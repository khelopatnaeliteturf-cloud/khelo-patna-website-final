export const metadata = {
  title: 'About Us — KheloPatna Elite Turf, Patna',
  description: 'Learn about KheloPatna Elite Turf — Patna\'s premier indoor cricket and football sports arena established in association with S.D. Public School, Kumhrar.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Us — KheloPatna Elite Turf',
    description: 'Learn about Patna\'s premier indoor sports arena established in association with S.D. Public School.',
    url: 'https://khelopatna.in/about',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'About KheloPatna' }]
  }
};

export default function AboutLayout({ children }) {
  return children;
}
