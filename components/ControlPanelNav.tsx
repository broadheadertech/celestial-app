"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calendar,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Bell,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/control_panel",
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    path: "/control_panel/products",
  },

  {
    id: "reservations",
    label: "Reservations",
    icon: Calendar,
    path: "/control_panel/reservations",
    badge: 5,
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    path: "/control_panel/customers",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    path: "/control_panel/reports",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/control_panel/settings",
  },
];

export default function ControlPanelNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleItemClick = (item: NavItem) => {
    router.push(item.path);
  };

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const isActive = (path: string) => {
    if (path === "/control_panel") {
      return pathname === "/control_panel";
    }
    return pathname.startsWith(path);
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-secondary/40 backdrop-blur-sm border-r border-white/10 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Control Panel</h2>
                <p className="text-xs text-white/60">Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-white" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.path);

          return (
            <div key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
                  isItemActive
                    ? "bg-primary text-white shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-1 bg-error text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="mt-auto p-4 border-t border-white/10 bg-secondary/40">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-white/60 text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 p-3 rounded-lg text-white/70 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}