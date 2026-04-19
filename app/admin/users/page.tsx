'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  RefreshCw,
  X,
  Plus,
} from 'lucide-react';
import { formatDate, getRelativeTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

// Portal-based dropdown that escapes overflow containers
interface UserMenuAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

function UserActionDropdown({
  anchorEl,
  actions,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  actions: UserMenuAction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const dropdownHeight = 220;
    const dropdownWidth = 208; // w-52
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const top = openUp ? rect.top - 4 : rect.bottom + 4;
    const left = Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 8);
    setPosition({ top, left: Math.max(8, left), openUp });
  }, [anchorEl]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    const scrollHandler = () => onClose();
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', scrollHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', scrollHandler);
    };
  }, [onClose, anchorEl]);

  if (!position || typeof window === 'undefined') return null;

  const getVariantClasses = (variant: string = 'default') => {
    const v: Record<string, string> = {
      default: 'text-white hover:bg-white/10',
      danger: 'text-error hover:bg-error/10',
      success: 'text-success hover:bg-success/10',
    };
    return v[variant] || v.default;
  };

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.openUp ? 'auto' : position.top,
        bottom: position.openUp ? window.innerHeight - position.top : 'auto',
        left: position.left,
      }}
      className="z-[9999] w-52 bg-secondary border border-white/15 rounded-lg shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => { action.onClick(); onClose(); }}
          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${getVariantClasses(action.variant)}`}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

function AdminUsersContent() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<HTMLElement | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch real users data with refresh key to force re-fetch
  const users = useQuery(
    api.services.admin.getAllUsers,
    {
      role: selectedRole !== 'all' ? selectedRole : undefined,
      search: searchQuery.trim() || undefined
    }
  );

  // Mutations for user management
  const toggleUserStatus = useMutation(api.services.admin.toggleUserStatus);
  const updateUserRole = useMutation(api.services.admin.updateUserRole);
  const adminCreateCustomer = useMutation(api.services.admin.adminCreateCustomer);
  const toggleSalesAssociate = useMutation(api.services.admin.toggleSalesAssociate);
  const deleteUserMutation = useMutation(api.services.admin.deleteUser);

  const handleToggleSA = async (userId: string) => {
    try {
      const result = await toggleSalesAssociate({ userId: userId as Id<"users"> });
      showConfirmation(
        result.isSalesAssociate ? 'Sales Associate Enabled' : 'Sales Associate Removed',
        `${result.name} is ${result.isSalesAssociate ? 'now' : 'no longer'} a sales associate.`,
        'success'
      );
    } catch (error) {
      showConfirmation('Error', error instanceof Error ? error.message : 'Failed to update', 'error');
    }
  };

  // Add customer modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const handleCreateCustomer = async () => {
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    setIsCreatingCustomer(true);
    try {
      await adminCreateCustomer({
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phone: newPhone || undefined,
      });
      setShowAddCustomer(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
      showConfirmation('Customer Created', `${newFirstName} ${newLastName} has been added.`, 'success');
    } catch (error) {
      showConfirmation('Error', error instanceof Error ? error.message : 'Failed to create customer', 'error');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const showConfirmation = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setConfirmationModalProps({ title, message, type });
    setShowConfirmationModal(true);
  };

  // Filter to show only client users (excluding admin and super_admin)
  const clientOnlyUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => user.role === 'client');
  }, [users]);

  // Calculate stats from real data (clients only)
  const userStats = useMemo(() => {
    if (!clientOnlyUsers) return {
      total: 0,
      active: 0,
      inactive: 0,
      newThisMonth: 0,
    };

    const total = clientOnlyUsers.length;
    const active = clientOnlyUsers.filter(u => u.isActive).length;
    const inactive = clientOnlyUsers.filter(u => !u.isActive).length;
    const newThisMonth = clientOnlyUsers.filter(u => u.createdAt > Date.now() - 2592000000).length;

    return { total, active, inactive, newThisMonth };
  }, [clientOnlyUsers]);

  // Apply additional client-side filters (already only clients)
  const filteredUsers = useMemo(() => {
    if (!clientOnlyUsers) return [];

    let filtered = clientOnlyUsers;

    // Status filter (additional to API filter)
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [clientOnlyUsers, selectedStatus]);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus({
        userId: userId as Id<'users'>,
        isActive: !currentStatus,
      });
      showConfirmation('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (error) {
      showConfirmation('Error', 'Error updating user status. Please try again.', 'error');
    }
    setSelectedUser(null);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      await updateUserRole({
        userId: userId as Id<'users'>,
        role: 'admin',
      });
      showConfirmation('Success', 'User promoted to admin successfully!', 'success');
    } catch (error) {
      showConfirmation('Error', 'Error promoting user to admin. Please try again.', 'error');
    }
    setSelectedUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users?.find((u: any) => u._id === userId);
    const userName = user ? `${(user as any).firstName} ${(user as any).lastName}` : 'this user';

    if (!confirm(`Delete ${userName}? This cannot be undone.`)) {
      setSelectedUser(null);
      return;
    }

    try {
      await deleteUserMutation({ userId: userId as Id<"users"> });
      showConfirmation('Deleted', `${userName} has been removed.`, 'success');
    } catch (error) {
      showConfirmation('Error', error instanceof Error ? error.message : 'Failed to delete user', 'error');
    }
    setSelectedUser(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedStatus('all');
    setShowFilters(false);
  };

  // Handle refresh without full page reload
  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Close any open menus
    setSelectedUser(null);

    // Reset filters to show all data
    setShowFilters(false);

    // Force re-fetch by updating the refresh key
    setRefreshKey(prev => prev + 1);

    // Add a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 800));

    setIsRefreshing(false);

    // Show success feedback
    showConfirmation('Refreshed', 'User data has been refreshed successfully', 'success');
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">User Management</h1>
                <p className="text-xs sm:text-sm text-white/60 truncate hidden xs:block">Manage client accounts</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-3 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0 touch-manipulation flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Add Customer</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-secondary/80 active:scale-95 transition-all flex-shrink-0 touch-manipulation disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 bg-secondary/60 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 active:scale-95 touch-manipulation ${
                showFilters || selectedStatus !== 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
              {selectedStatus !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-2 sm:hidden overflow-x-auto scrollbar-hide pb-1">
            <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 min-w-[110px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-lg bg-success/10">
                  <Users className="w-3.5 h-3.5 text-success" />
                </div>
                <span className="text-[10px] font-medium text-success whitespace-nowrap">
                  {userStats.total} total
                </span>
              </div>
              <p className="text-base font-bold text-white">{userStats.active}</p>
              <p className="text-[10px] text-white/60">Active Clients</p>
            </div>
            <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 min-w-[110px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-lg bg-error/10">
                  <User className="w-3.5 h-3.5 text-error" />
                </div>
                <span className="text-[10px] font-medium text-error">
                  {userStats.inactive}
                </span>
              </div>
              <p className="text-base font-bold text-white">{userStats.inactive}</p>
              <p className="text-[10px] text-white/60">Inactive</p>
            </div>
            <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 min-w-[110px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded-lg bg-primary/10">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                  This month
                </span>
              </div>
              <p className="text-base font-bold text-white">{userStats.newThisMonth}</p>
              <p className="text-[10px] text-white/60">New Clients</p>
            </div>
          </div>

          {/* Desktop: single row grid */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-3">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <Users className="w-4 h-4 text-success" />
                </div>
                <span className="text-xs font-medium text-success whitespace-nowrap">
                  {userStats.total} total
                </span>
              </div>
              <p className="text-lg font-bold text-white">{userStats.active}</p>
              <p className="text-xs text-white/60">Active Clients</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-error/10">
                  <User className="w-4 h-4 text-error" />
                </div>
                <span className="text-xs font-medium text-error">
                  {userStats.inactive}
                </span>
              </div>
              <p className="text-lg font-bold text-white">{userStats.inactive}</p>
              <p className="text-xs text-white/60">Inactive</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-primary whitespace-nowrap">
                  This month
                </span>
              </div>
              <p className="text-lg font-bold text-white">{userStats.newThisMonth}</p>
              <p className="text-xs text-white/60">New Clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-medium text-white">Status Filter</label>
              {selectedStatus !== 'all' && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:text-primary/80 transition-colors touch-manipulation"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { value: 'all', label: 'All Status', count: userStats.total },
                { value: 'active', label: 'Active', count: userStats.active },
                { value: 'inactive', label: 'Inactive', count: userStats.inactive },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 touch-manipulation whitespace-nowrap ${
                    selectedStatus === status.value
                      ? 'bg-info border-info text-white'
                      : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                  }`}
                >
                  <span>{status.label}</span>
                  <div className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
                    selectedStatus === status.value
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {status.count}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Client Users <span className="text-white/60">({filteredUsers.length})</span>
          </h2>
          {filteredUsers.length === 0 && clientOnlyUsers && clientOnlyUsers.length > 0 && (
            <button
              onClick={clearFilters}
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-[10px] sm:text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Loading State */}
        {!users ? (
          <div className="text-center py-8 sm:py-12">
            <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">Loading users...</h3>
            <p className="text-xs sm:text-sm text-white/60">Please wait while we fetch user data.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State */
          <div className="text-center py-8 sm:py-12">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">No users found</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 text-center px-4">
              {!clientOnlyUsers || clientOnlyUsers.length === 0
                ? 'No clients have been registered yet.'
                : 'Try adjusting your search terms or filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* ==================== DESKTOP TABLE (sm and up) ==================== */}
            <div className="hidden sm:block">
              <div className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60">
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">SA</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider text-right">Orders</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider text-right">Total Spent</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider">Joined</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((user) => {
                        if (user.role !== 'client') return null;
                        return (
                          <tr
                            key={user._id}
                            className={`transition-colors hover:bg-white/5 ${
                              !user.isActive ? 'bg-error/5' : ''
                            }`}
                          >
                            {/* Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                                  <span className="text-xs font-bold text-primary">
                                    {user.firstName[0]}{user.lastName[0]}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-white whitespace-nowrap">
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                            </td>
                            {/* Email */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-white/70">{user.email}</span>
                            </td>
                            {/* Phone */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-white/70">{user.phone || '—'}</span>
                            </td>
                            {/* Role */}
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 capitalize">
                                {(user.role as string) === 'super_admin' ? 'Super Admin' : user.role}
                              </span>
                            </td>
                            {/* Sales Associate badge */}
                            <td className="px-4 py-3">
                              {user.isSalesAssociate ? (
                                <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-success/10 text-success border border-success/30">
                                  SA
                                </span>
                              ) : (
                                <span className="text-xs text-white/30">—</span>
                              )}
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              {user.isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error">
                                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            {/* Orders */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-white">{user.totalOrders}</span>
                            </td>
                            {/* Total Spent */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-white">{formatCurrency(user.totalSpent || 0)}</span>
                            </td>
                            {/* Joined */}
                            <td className="px-4 py-3">
                              <span className="text-xs text-white/60 whitespace-nowrap">{getRelativeTime(user.createdAt)}</span>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={(e) => {
                                  if (selectedUser === user._id) {
                                    setSelectedUser(null);
                                    setDropdownAnchor(null);
                                  } else {
                                    setSelectedUser(user._id);
                                    setDropdownAnchor(e.currentTarget);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all inline-flex items-center justify-center"
                              >
                                <MoreVertical className="w-4 h-4 text-white/60" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ==================== MOBILE CARDS (below sm) ==================== */}
            <div className="sm:hidden space-y-2.5">
              {filteredUsers.map((user) => {
                if (user.role !== 'client') return null;
                return (
                  <div
                    key={user._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-lg p-3 transition-all duration-200 hover:border-primary/30 ${
                      !user.isActive
                        ? 'border-error/30 bg-error/5'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex gap-2.5">
                      {/* User Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center border border-white/10">
                          <span className="text-sm font-bold text-primary">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <h3 className="font-bold text-sm text-white truncate">
                                {user.firstName} {user.lastName}
                              </h3>
                              {!user.isActive && (
                                <div className="px-1.5 py-0.5 rounded-lg bg-error/10 text-error border border-error/30 flex-shrink-0">
                                  <span className="text-[10px] font-medium">Inactive</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-0.5 text-xs text-white/60">
                              <div className="flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions Menu */}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setSelectedUser(selectedUser === user._id ? null : user._id)}
                              className="p-1.5 rounded hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedUser === user._id && (
                              <div className="absolute right-0 top-8 w-44 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                                    className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 active:bg-white/15 flex items-center gap-2 transition-colors touch-manipulation"
                                  >
                                    {user.isActive ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                                    <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                                  </button>
                                  {(['admin', 'super_admin'] as string[]).includes(user.role) && (
                                    <button
                                      onClick={() => handleToggleSA(user._id)}
                                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 active:bg-white/15 flex items-center gap-2 transition-colors touch-manipulation"
                                    >
                                      <Shield className="w-3.5 h-3.5 text-success" />
                                      <span>{user.isSalesAssociate ? 'Remove Sales Associate' : 'Mark as Sales Associate'}</span>
                                    </button>
                                  )}
                                  <div className="border-t border-white/10 my-1"></div>
                                  <button
                                    onClick={() => handleDeleteUser(user._id)}
                                    className="w-full px-3 py-2 text-left text-xs text-error hover:bg-error/10 active:bg-error/15 flex items-center gap-2 transition-colors touch-manipulation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete User</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* User Stats and Info */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-primary/10 text-primary border border-primary/30 whitespace-nowrap capitalize">
                              {(user.role as string) === 'super_admin' ? 'Super Admin' : user.role}
                            </div>
                            {user.isSalesAssociate && (
                              <div className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-success/10 text-success border border-success/30 whitespace-nowrap">
                                Sales Associate
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-[10px] text-white/60 whitespace-nowrap">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span className="hidden xs:inline">Joined </span>
                              <span>{getRelativeTime(user.createdAt)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {user.totalOrders > 0 && (
                              <>
                                <p className="text-xs font-medium text-white">
                                  {user.totalOrders} orders
                                </p>
                                <p className="text-[10px] text-white/60">
                                  {formatCurrency(user.totalSpent || 0)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-1 text-[10px] text-white/60 flex-1 min-w-0">
                            <span className="hidden xs:inline">Last active:</span>
                            <span className="xs:hidden">Active:</span>
                            <span className="truncate">{getRelativeTime(user.updatedAt)}</span>
                          </div>

                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium hover:opacity-80 active:scale-95 transition-all flex-shrink-0 whitespace-nowrap touch-manipulation ${
                              user.isActive
                                ? 'bg-error/10 border border-error/20 text-error'
                                : 'bg-success/10 border border-success/20 text-success'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Click outside to close menu */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedUser(null)}
        />
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Add Customer Modal - Bottom sheet on mobile, centered dialog on desktop */}
      {showAddCustomer && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setShowAddCustomer(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:w-full sm:max-w-md sm:mx-4">
              <div className="flex justify-center pt-2 pb-3 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Add Customer</h3>
              <p className="text-sm text-white/60 mb-4">Register a walk-in customer</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="First name *"
                    className="px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Last name *"
                    className="px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email address *"
                  className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                  className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomer}
                    disabled={!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || isCreatingCustomer}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isCreatingCustomer ? 'Creating...' : 'Add Customer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Actions Dropdown (portal-based) */}
      {selectedUser && dropdownAnchor && (() => {
        const user = filteredUsers.find((u: any) => u._id === selectedUser);
        if (!user) return null;

        const actions: UserMenuAction[] = [
          {
            icon: user.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />,
            label: user.isActive ? 'Deactivate' : 'Activate',
            onClick: () => handleToggleUserStatus(user._id, user.isActive ?? false),
          },
        ];

        if ((['admin', 'super_admin'] as string[]).includes(user.role)) {
          actions.push({
            icon: <Shield className="w-4 h-4 text-success" />,
            label: user.isSalesAssociate ? 'Remove Sales Associate' : 'Mark as Sales Associate',
            onClick: () => handleToggleSA(user._id),
            variant: 'success',
          });
        }

        actions.push({
          icon: <Trash2 className="w-4 h-4" />,
          label: 'Delete User',
          onClick: () => handleDeleteUser(user._id),
          variant: 'danger',
        });

        return (
          <UserActionDropdown
            anchorEl={dropdownAnchor}
            actions={actions}
            onClose={() => { setSelectedUser(null); setDropdownAnchor(null); }}
          />
        );
      })()}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />
    </div>
  );
}

// Main Export with SafeAreaProvider
export default function AdminUsersPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminUsersContent />
    </SafeAreaProvider>
  );
}
