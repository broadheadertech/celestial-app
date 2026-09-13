import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Check the status of your order or reservation with your code and email.',
  alternates: { canonical: '/track' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
