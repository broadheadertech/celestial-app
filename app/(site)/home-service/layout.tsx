import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Home Service — Tank Cleaning, Setup & Maintenance',
  description:
    'Book our team to come to you: tank cleaning and water changes, monthly maintenance, new tank setup, aquascaping and fish health checks. See prices and travel fees by area.',
  alternates: { canonical: '/home-service' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
