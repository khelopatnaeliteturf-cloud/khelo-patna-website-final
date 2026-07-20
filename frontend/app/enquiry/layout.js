export const metadata = {
  title: 'Academy Enquiry — KheloPatna Training Academy, Patna',
  description: 'Submit an enquiry to join KheloPatna Training Academy for professional cricket and football coaching in Patna, Bihar.',
  alternates: { canonical: '/enquiry' },
  openGraph: {
    title: 'Academy Enquiry — KheloPatna Training Academy',
    description: 'Submit an enquiry to join KheloPatna Training Academy for professional cricket and football coaching.',
    url: 'https://khelopatna.in/enquiry',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Academy Enquiry' }]
  }
};

export default function EnquiryLayout({ children }) {
  return children;
}
