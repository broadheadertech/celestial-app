import { ReactNode } from 'react';
import AdminLayoutWrapper from '@/components/admin/AdminLayoutWrapper';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  );
}