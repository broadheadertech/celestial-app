import { ReactNode } from 'react';
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