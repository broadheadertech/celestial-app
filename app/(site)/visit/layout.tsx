import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Visit & Book a Viewing',
  description: 'Book a private viewing at our gallery. See opening hours, location and what a visit looks like.',
  alternates: { canonical: '/visit' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
