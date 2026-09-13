import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'About',
  description: 'The story behind Dragon\'s Cave and how we keep our fish.',
  alternates: { canonical: '/about' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
