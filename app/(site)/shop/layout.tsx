import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Shop — Food, Lights & Gear',
  description: 'Aquarium food, lighting, tanks and accessories we use ourselves. Order online, pay after we confirm.',
  alternates: { canonical: '/shop' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
