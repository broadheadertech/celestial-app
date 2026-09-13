import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Admin · Dragon's Cave",
  description: 'Admin console for inventory, reservations, and point of sale.',
  robots: { index: false, follow: false },
};
import AdminLayoutWrapper from '@/components/admin/AdminLayoutWrapper';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminLayoutWrapper>
        {children}
      </AdminLayoutWrapper>
    </AdminGuard>
  );
}