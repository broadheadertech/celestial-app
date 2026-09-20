'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import AdminNotificationPopup from '@/components/notifications/AdminNotificationPopup';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import AdminToaster from '@/components/admin/AdminToaster';

interface AdminLayoutWrapperProps {
  children: ReactNode;
}

export default function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const { user } = useAuthStore();

  return (
    // .theme-compat: light-theme compatibility layer for screens still written with
    // hardcoded white text/borders (see app/globals.css).
    <div className="theme-compat">
      {/* Desktop Sidebar - hidden on mobile */}
      <AdminSidebar />

      {/* Main content column - offset on desktop for sidebar */}
      <div className="sm:ml-64 flex flex-col min-h-screen">
        {/* Phone top bar + drawer (below sm). In normal flow, so no content offset is needed. */}
        <AdminMobileNav />
        {/* Desktop top bar - hidden on mobile */}
        <AdminTopBar />
        {children}
      </div>

      {/* In-app messages (replaces browser alert popups) */}
      <AdminToaster />

      {/* Global Real-time Notification Popup for Admin */}
      {user?.role === 'admin' || user?.role === 'super_admin' ? (
        <AdminNotificationPopup
          userId={user._id}
          userRole={user.role}
        />
      ) : null}
    </div>
  );
}
