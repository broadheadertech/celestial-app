'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import AdminNotificationPopup from '@/components/notifications/AdminNotificationPopup';

interface AdminLayoutWrapperProps {
  children: ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const { user } = useAuthStore();

  return (
    <>
      {children}

      {/* Global Real-time Notification Popup for Admin */}
      {user?.role === 'admin' || user?.role === 'super_admin' ? (
        <AdminNotificationPopup
          userId={user._id}
          userRole={user.role}
        />
      ) : null}
    </>
  );
}