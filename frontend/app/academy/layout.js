export const metadata = {
  title: 'Training Academy — KheloPatna Elite Turf, Patna',
  description: 'Join KheloPatna Training Academy for professional cricket and football coaching. Expert coaches, indoor arena, and flexible batch timings in Patna, Bihar.',
  alternates: { canonical: '/academy' },
  openGraph: {
    title: 'Training Academy — KheloPatna Elite Turf',
    description: 'Professional cricket and football coaching programs with expert coaches in Patna.',
    url: 'https://khelopatna.in/academy',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'KheloPatna Academy' }]
  }
};

export default function AcademyLayout({ children }) {
  return children;
}
