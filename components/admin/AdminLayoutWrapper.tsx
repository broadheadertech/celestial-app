'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import AdminNotificationPopup from '@/components/notifications/AdminNotificationPopup';
import AdminSidebar from '@/components/admin/AdminSidebar';

interface AdminLayoutWrapperProps {
  children: ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const { user } = useAuthStore();

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <AdminSidebar />

      {/* Main content - offset on desktop for sidebar */}
      <div className="sm:ml-64">
        {children}
      </div>

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
