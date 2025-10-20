'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  RefreshCw,
  Download,
  Ban,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Activity,
  Clock,
  MapPin,
  CreditCard,
  Eye,
  Lock,
  Unlock,
  UserX,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import CustomerConfirmationModal from '@/components/ui/CustomerConfirmationModal';
import ControlPanelNav from '@/components/ControlPanelNav';

// Fix 1: Move these functions inside the component or ensure they're consistent between server and client
const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

export default function CustomerManagement() {
  const router = useRouter();
  
  // Fix 2: Add state to track when component is mounted to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLoginMethod, setSelectedLoginMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => () => {});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch all users with super admin access
  const users = useQuery(api.services.admin.getAllUsers, { 
    role: selectedRole !== 'all' ? selectedRole : undefined,
    search: searchQuery.trim() || undefined 
  });

  // Super admin mutations
  const toggleUserStatus = useMutation(api.services.admin.toggleUserStatus);
  const updateUserRole = useMutation(api.services.admin.updateUserRole);
  const deleteUser = useMutation(api.services.admin.deleteUser);
  const resetUserPassword = useMutation(api.services.admin.resetUserPassword);
  const bulkUpdateUsers = useMutation(api.services.admin.bulkUpdateUsers);
  const banUser = useMutation(api.services.admin.banUser);
  const unbanUser = useMutation(api.services.admin.unbanUser);

  const showConfirmation = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    action?: () => void
  ) => {
    setConfirmationModalProps({ title, message, type });
    if (action) {
      setConfirmationAction(() => action);
    } else {
      setConfirmationAction(() => () => {});
    }
    setShowConfirmationModal(true);
  };

  // Handle refresh without full page reload
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Close any open menus
    setSelectedUser(null);
    setShowBulkActions(false);
    setSelectedUsers(new Set());
    
    // Reset filters
    setShowFilters(false);
    setShowAdvancedFilters(false);
    
    // Add a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsRefreshing(false);
    
    // Show success feedback
    showConfirmation('Refreshed', 'Customer data has been refreshed successfully', 'success');
  };

  // Enhanced stats calculation for super admin
  const userStats = useMemo(() => {
    if (!users) return {
      total: 0,
      active: 0,
      inactive: 0,
      banned: 0,
      admins: 0,
      superAdmins: 0,
      clients: 0,
      newToday: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      emailUsers: 0,
      facebookUsers: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      topSpenders: 0
    };

    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;
    const oneMonthAgo = now - 2592000000;

    const total = users.length;
    const active = users.filter(u => u.isActive && !u.isBanned).length;
    const inactive = users.filter(u => !u.isActive && !u.isBanned).length;
    const banned = users.filter(u => u.isBanned).length;
    const admins = users.filter(u => u.role === 'admin').length;
    const superAdmins = users.filter(u => u.role === 'super_admin').length;
    const clients = users.filter(u => u.role === 'client').length;
    const newToday = users.filter(u => u.createdAt > oneDayAgo).length;
    const newThisWeek = users.filter(u => u.createdAt > oneWeekAgo).length;
    const newThisMonth = users.filter(u => u.createdAt > oneMonthAgo).length;
    const emailUsers = users.filter(u => u.loginMethod === 'email').length;
    const facebookUsers = users.filter(u => u.loginMethod === 'facebook').length;
    
    // Calculate revenue stats
    const totalRevenue = users.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
    const avgOrderValue = clients > 0 ? totalRevenue / clients : 0;
    const topSpenders = users.filter(u => (u.totalSpent || 0) > 10000).length;

    return { 
      total, active, inactive, banned, admins, superAdmins, clients, 
      newToday, newThisWeek, newThisMonth, emailUsers, facebookUsers,
      totalRevenue, avgOrderValue, topSpenders
    };
  }, [users]);

  // Enhanced filtering with super admin options
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users;

    // Status filter
    if (selectedStatus !== 'all') {
      switch(selectedStatus) {
        case 'active':
          filtered = filtered.filter(u => u.isActive && !u.isBanned);
          break;
        case 'inactive':
          filtered = filtered.filter(u => !u.isActive && !u.isBanned);
          break;
        case 'banned':
          filtered = filtered.filter(u => u.isBanned);
          break;
      }
    }

    // Login method filter
    if (selectedLoginMethod !== 'all') {
      filtered = filtered.filter(u => u.loginMethod === selectedLoginMethod);
    }

    // Sort
    filtered = filtered.sort((a, b) => {
      switch(sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'spent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'orders':
          return (b.totalOrders || 0) - (a.totalOrders || 0);
        case 'lastActive':
          return b.updatedAt - a.updatedAt;
        case 'createdAt':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }, [users, selectedStatus, selectedLoginMethod, sortBy]);

  // Super Admin Actions
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const actionTitle = currentStatus ? 'Deactivate Account' : 'Activate Account';
    const actionMessage = currentStatus 
      ? 'Are you sure you want to deactivate this user account? The user will not be able to log in until reactivated.'
      : 'Are you sure you want to activate this user account? The user will regain access to the system.';
    
    showConfirmation(
      actionTitle,
      actionMessage,
      currentStatus ? 'warning' : 'info',
      async () => {
        try {
          await toggleUserStatus({
            userId: userId as Id<'users'>,
            isActive: !currentStatus,
          });
          showConfirmation('Success', `User ${action}d successfully!`, 'success');
        } catch (error) {
          console.error('Error toggling user status:', error);
          showConfirmation('Error', 'Failed to update user status.', 'error');
        }
        setSelectedUser(null);
      }
    );
  };

  const handleChangeUserRole = async (userId: string, newRole: 'client' | 'admin' | 'super_admin') => {
    showConfirmation(
      'Change User Role',
      `Are you sure you want to change this user's role to ${newRole}? This will affect their system access.`,
      'warning',
      async () => {
        try {
          await updateUserRole({
            userId: userId as Id<'users'>,
            role: newRole,
          });
          showConfirmation('Success', `User role changed to ${newRole} successfully!`, 'success');
        } catch (error) {
          console.error('Error updating user role:', error);
          showConfirmation('Error', 'Failed to update user role.', 'error');
        }
        setSelectedUser(null);
      }
    );
  };

  const handleDeleteUser = async (userId: string) => {
    showConfirmation(
      'Delete User',
      'Are you sure you want to permanently delete this user? This action cannot be undone.',
      'error',
      async () => {
        try {
          await deleteUser({ userId: userId as Id<'users'> });
          showConfirmation('Success', 'User deleted successfully!', 'success');
        } catch (error) {
          console.error('Error deleting user:', error);
          showConfirmation('Error', 'Failed to delete user.', 'error');
        }
        setSelectedUser(null);
      }
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) {
      showConfirmation('No Selection', 'Please select users first.', 'warning');
      return;
    }

    const userIds = Array.from(selectedUsers);
    
    showConfirmation(
      'Bulk Action',
      `Apply "${action}" to ${userIds.length} selected users?`,
      'warning',
      async () => {
        try {
          await bulkUpdateUsers({ 
            userIds: userIds as Id<'users'>[],
            action 
          });
          showConfirmation('Success', 'Bulk action completed!', 'success');
          setSelectedUsers(new Set());
          setShowBulkActions(false);
        } catch (error) {
          console.error('Error in bulk action:', error);
          showConfirmation('Error', 'Bulk action failed.', 'error');
        }
      }
    );
  };

  // Fix 3: Wrap browser-specific code in useEffect to avoid server-side execution
  const handleExportUsers = () => {
    if (!isMounted) return;
    
    // Convert users to CSV or JSON for export
    const data = filteredUsers.map(u => ({
      Name: `${u.firstName} ${u.lastName}`,
      Email: u.email,
      Phone: u.phone || 'N/A',
      Role: u.role,
      Status: u.isActive ? 'Active' : 'Inactive',
      LoginMethod: u.loginMethod || 'email',
      TotalOrders: u.totalOrders || 0,
      TotalSpent: u.totalSpent || 0,
      JoinedDate: formatDate(u.createdAt),
      LastActive: formatDate(u.updatedAt)
    }));

    // Create CSV
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showConfirmation('Export Complete', 'Customer data exported successfully!', 'success');
  };

  // Fix 4: Define formatDate and getRelativeTime inside the component to ensure consistency
  const formatDate = (timestamp: number) => {
    if (!isMounted) return '';
    return new Date(timestamp).toLocaleDateString();
  };

  const getRelativeTime = (timestamp: number) => {
    if (!isMounted) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`;
    
    return 'Just now';
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u._id)));
    }
  };

  // Banning functionality
  const handleBanUser = async (userId: string) => {
    showConfirmation(
      'Ban User',
      'Are you sure you want to ban this user? They will not be able to access their account.',
      'warning',
      async () => {
        try {
          await banUser({ userId: userId as Id<'users'> });
          showConfirmation('Success', 'User has been banned successfully.', 'success');
        } catch (error) {
          console.error('Error banning user:', error);
          showConfirmation('Error', 'Failed to ban user.', 'error');
        }
        setSelectedUser(null);
      }
    );
  };

  const handleUnbanUser = async (userId: string) => {
    showConfirmation(
      'Unban User',
      'Are you sure you want to unban this user? They will regain access to their account.',
      'info',
      async () => {
        try {
          await unbanUser({ userId: userId as Id<'users'> });
          showConfirmation('Success', 'User has been unbanned successfully.', 'success');
        } catch (error) {
          console.error('Error unbanning user:', error);
          showConfirmation('Error', 'Failed to unban user.', 'error');
        }
        setSelectedUser(null);
      }
    );
  };

  // Fix 5: Conditionally render parts that depend on browser APIs or client-side only data
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <ControlPanelNav />
        <div className="lg:pl-64">
          <div className="p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="h-12 bg-gray-200 rounded mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <ControlPanelNav />
      
      <div className="lg:pl-64">
        {/* Enhanced Super Admin Header */}
        <div className="sticky top-0 z-40 bg-[var(--color-secondary)]">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-[var(--color-secondary)] border border-[var(--color-muted)]/10 hover:bg-[var(--color-muted)]/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--color-foreground)]" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Customer Management</h1>
                    <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] text-[var(--color-foreground)] text-xs font-bold">
                      SUPER ADMIN
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">Complete control over all user accounts</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExportUsers}
                  className="px-4 py-2 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] flex items-center space-x-2 hover:bg-[var(--color-success)]/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export</span>
                </button>
                
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-[var(--color-warning)] flex items-center space-x-2 hover:bg-[var(--color-warning)]/20 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Bulk Actions</span>
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center space-x-2 hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]/40" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-secondary)]/60 border border-[var(--color-muted)]/10 rounded-lg text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] border-transparent text-[var(--color-foreground)]'
                    : 'bg-[var(--color-secondary)]/60 border-[var(--color-muted)]/10 text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]/80'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard for Super Admin */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-muted)]/10 bg-[var(--color-secondary)]">
          <div className="flex justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 w-full max-w-6xl">
              <div className="bg-[var(--color-secondary)]/40 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-muted)]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-primary)]/10">
                    <Users className="w-4 h-4 text-[var(--color-primary)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-primary)]">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{userStats.total}</p>
                <p className="text-xs text-[var(--color-muted)]">All Users</p>
              </div>

              <div className="bg-[var(--color-secondary)]/40 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-muted)]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-success)]/10">
                    <UserCheck className="w-4 h-4 text-[var(--color-success)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-success)]">ACTIVE</span>
                </div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{userStats.active}</p>
                <p className="text-xs text-[var(--color-muted)]">{Math.round(userStats.active / userStats.total * 100)}% of total</p>
              </div>

              <div className="bg-[var(--color-secondary)]/40 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-muted)]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-warning)]/10">
                    <Shield className="w-4 h-4 text-[var(--color-warning)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-warning)]">STAFF</span>
                </div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{userStats.admins + userStats.superAdmins}</p>
                <p className="text-xs text-[var(--color-muted)]">{userStats.admins} Admin, {userStats.superAdmins} Super</p>
              </div>

              <div className="bg-[var(--color-secondary)]/40 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-muted)]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-info)]/10">
                    <TrendingUp className="w-4 h-4 text-[var(--color-info)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-info)]">NEW</span>
                </div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{userStats.newThisMonth}</p>
                <p className="text-xs text-[var(--color-muted)]">This month</p>
              </div>

              <div className="bg-[var(--color-secondary)]/40 backdrop-blur-sm rounded-xl p-3 border border-[var(--color-muted)]/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-error)]/10">
                    <Ban className="w-4 h-4 text-[var(--color-error)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-error)]">ISSUES</span>
                </div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{userStats.inactive + userStats.banned}</p>
                <p className="text-xs text-[var(--color-muted)]">{userStats.inactive} inactive, {userStats.banned} banned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters for Super Admin */}
        {showFilters && (
          <div className="bg-[var(--color-secondary)]/60 border-b border-[var(--color-muted)]/10 px-4 sm:px-6 py-4">
            <div className="space-y-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">Role</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'All Roles', count: userStats.total },
                    { value: 'client', label: 'Clients', count: userStats.clients },
                    { value: 'admin', label: 'Admins', count: userStats.admins },
                    { value: 'super_admin', label: 'Super Admins', count: userStats.superAdmins },
                  ].map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                        selectedRole === role.value
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] border-transparent text-[var(--color-foreground)]'
                          : 'bg-[var(--color-secondary)]/60 border-[var(--color-muted)]/10 text-[var(--color-muted)]/70 hover:text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <span>{role.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedRole === role.value
                          ? 'bg-[var(--color-foreground)]/20'
                          : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      }`}>
                        {role.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'All Status', count: userStats.total },
                    { value: 'active', label: 'Active', count: userStats.active, color: 'success' },
                    { value: 'inactive', label: 'Inactive', count: userStats.inactive, color: 'warning' },
                    { value: 'banned', label: 'Banned', count: userStats.banned, color: 'error' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                        selectedStatus === status.value
                          ? `bg-[var(--color-${status.color})] border-[var(--color-${status.color})] text-[var(--color-foreground)]`
                          : 'bg-[var(--color-secondary)]/60 border-[var(--color-muted)]/10 text-[var(--color-muted)]/70 hover:text-[var(--color-foreground)] hover:border-[var(--color-primary)]/20'
                      }`}
                    >
                      <span>{status.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedStatus === status.value
                          ? 'bg-[var(--color-foreground)]/20'
                          : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      }`}>
                        {status.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Method Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">Login Method</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'All Methods', count: userStats.total },
                    { value: 'email', label: 'Email', count: userStats.emailUsers },
                    { value: 'facebook', label: 'Facebook', count: userStats.facebookUsers },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setSelectedLoginMethod(method.value)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                        selectedLoginMethod === method.value
                          ? 'bg-[var(--color-info)] border-[var(--color-info)] text-[var(--color-foreground)]'
                          : 'bg-[var(--color-secondary)]/60 border-[var(--color-muted)]/10 text-[var(--color-muted)]/70 hover:text-[var(--color-foreground)] hover:border-[var(--color-info)]/20'
                      }`}
                    >
                      <span>{method.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedLoginMethod === method.value
                          ? 'bg-[var(--color-foreground)]/20'
                          : 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                      }`}>
                        {method.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-secondary)]/60 border border-[var(--color-muted)]/10 text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="createdAt">Join Date (Newest)</option>
                  <option value="lastActive">Last Active</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="email">Email (A-Z)</option>
                  <option value="spent">Total Spent (High to Low)</option>
                  <option value="orders">Total Orders (High to Low)</option>
                </select>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 text-sm font-medium flex items-center space-x-1"
              >
                <ChevronDown className={`w-4 h-4 transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                <span>{showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20 border-b border-[var(--color-muted)]/10 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={selectAllUsers}
                  className="w-4 h-4 rounded border-[var(--color-muted)]/20 bg-[var(--color-secondary)]/40 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-foreground)]">
                  {selectedUsers.size === 0 
                    ? 'Select users' 
                    : `${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''} selected`}
                </span>
              </div>
              
              {selectedUsers.size > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] text-xs hover:bg-[var(--color-success)]/20"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-[var(--color-warning)] text-xs hover:bg-[var(--color-warning)]/20"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleBulkAction('ban')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-xs hover:bg-[var(--color-error)]/20"
                  >
                    Ban
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-error)] border border-[var(--color-error)] text-[var(--color-foreground)] text-xs hover:bg-[var(--color-error)]/80"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--color-foreground)]">
              Customers ({filteredUsers.length})
            </h2>
            {filteredUsers.length === 0 && users && users.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('all');
                  setSelectedStatus('all');
                  setSelectedLoginMethod('all');
                }}
                className="px-3 py-1 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)] text-[var(--color-primary)] text-xs hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {!users ? (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 animate-spin text-[var(--color-primary)] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Loading customers...</h3>
              <p className="text-[var(--color-muted)]">Fetching user data from the database.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[var(--color-muted)]/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">No customers found</h3>
              <p className="text-[var(--color-muted)] mb-6">
                {!users || users.length === 0
                  ? 'No users have registered in the system yet.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {users && users.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRole('all');
                    setSelectedStatus('all');
                    setSelectedLoginMethod('all');
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] text-[var(--color-foreground)] hover:from-[var(--color-primary)]/80 hover:to-[var(--color-warning)]/80 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`bg-[var(--color-secondary)]/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:border-[var(--color-primary)]/30 ${
                    user.isBanned 
                      ? 'border-[var(--color-error)]/50 bg-[var(--color-error)]/5' 
                      : !user.isActive
                      ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                      : user.role === 'super_admin'
                      ? 'border-[var(--color-primary)]/30 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10'
                      : user.role === 'admin'
                      ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                      : 'border-[var(--color-muted)]/10'
                  }`}
                >
                  <div className="flex space-x-4">
                    {/* Selection Checkbox for Bulk Actions */}
                    {showBulkActions && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                          className="w-4 h-4 rounded border-[var(--color-muted)]/20 bg-[var(--color-secondary)]/40 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                      </div>
                    )}

                    {/* Enhanced User Avatar with Status Indicators */}
                    <div className="relative flex-shrink-0">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-16 h-16 rounded-lg object-cover border border-[var(--color-muted)]/10"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center border ${
                          user.role === 'super_admin'
                            ? 'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-warning)]/20 border-[var(--color-primary)]/30'
                            : user.role === 'admin'
                            ? 'bg-gradient-to-br from-[var(--color-warning)]/20 to-[var(--color-warning)]/20 border-[var(--color-warning)]/30'
                            : 'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-info)]/20 border-[var(--color-muted)]/10'
                        }`}>
                          <span className="text-lg font-bold text-[var(--color-foreground)]">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      )}
                      
                      {/* Role Badge */}
                      {user.role === 'super_admin' && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)]">
                          <ShieldCheck className="w-3 h-3 text-[var(--color-foreground)]" />
                        </div>
                      )}
                      {user.role === 'admin' && !user.role.includes('super') && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-[var(--color-warning)]">
                          <Shield className="w-3 h-3 text-[var(--color-foreground)]" />
                        </div>
                      )}
                      {user.isBanned && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--color-error)]">
                          <Ban className="w-3 h-3 text-[var(--color-foreground)]" />
                        </div>
                      )}
                      
                      {/* Online Status Indicator */}
                      {user.isOnline && (
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-secondary)]"></div>
                      )}
                    </div>

                    {/* Enhanced User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-[var(--color-foreground)]">
                              {user.firstName} {user.lastName}
                            </h3>
                            
                            {/* Status Badges */}
                            <div className="flex items-center space-x-1">
                              {user.role === 'super_admin' && (
                                <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] text-[var(--color-foreground)] text-xs font-bold">
                                  SUPER ADMIN
                                </div>
                              )}
                              {user.role === 'admin' && !user.role.includes('super') && (
                                <div className="px-2 py-0.5 rounded-full bg-[var(--color-warning)] text-[var(--color-foreground)] text-xs font-bold">
                                  ADMIN
                                </div>
                              )}
                              {user.isBanned && (
                                <div className="px-2 py-0.5 rounded-full bg-[var(--color-error)] text-[var(--color-foreground)] text-xs font-bold">
                                  BANNED
                                </div>
                              )}
                              {!user.isActive && !user.isBanned && (
                                <div className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30 text-xs font-medium flex items-center space-x-1">
                                  <UserX className="w-3 h-3" />
                                  <span>Inactive</span>
                                </div>
                              )}
                              {user.isActive && !user.isBanned && (
                                <div className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30 text-xs font-medium flex items-center space-x-1">
                                  <UserCheck className="w-3 h-3" />
                                  <span>Active</span>
                                </div>
                              )}
                              {user.isVerified && (
                                <div className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30 text-xs font-medium">
                                  Verified
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Contact Information */}
                          <div className="space-y-1 text-sm text-[var(--color-muted)]">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                              {user.loginMethod === 'facebook' && (
                                <div className="px-1.5 py-0.5 rounded bg-[var(--color-info)]/20 text-[var(--color-info)] text-xs">
                                  FB
                                </div>
                              )}
                            </div>
                            {user.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-3 h-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{user.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Super Admin Actions Menu - Role-based options */}
                        {user.role !== 'super_admin' && (
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => setSelectedUser(selectedUser === user._id ? null : user._id)}
                              className="p-2 sm:p-2.5 rounded-lg hover:bg-[var(--color-muted)]/10 active:scale-95 transition-all touch-manipulation"
                            >
                              <MoreVertical className="w-5 h-5 text-[var(--color-muted)]/60" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* User Metrics and Activity */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="bg-[var(--color-secondary)]/80 rounded-lg px-2 py-1.5">
                          <div className="flex items-center space-x-1 text-xs text-[var(--color-muted)] mb-0.5">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Orders</span>
                          </div>
                          <p className="text-sm font-bold text-[var(--color-foreground)]">{user.totalOrders || 0}</p>
                        </div>
                        
                        <div className="bg-[var(--color-secondary)]/80 rounded-lg px-2 py-1.5">
                          <div className="flex items-center space-x-1 text-xs text-[var(--color-muted)] mb-0.5">
                            <DollarSign className="w-3 h-3" />
                            <span>Spent</span>
                          </div>
                          <p className="text-sm font-bold text-[var(--color-foreground)]">{formatCurrency(user.totalSpent || 0)}</p>
                        </div>
                        
                        <div className="bg-[var(--color-secondary)]/80 rounded-lg px-2 py-1.5">
                          <div className="flex items-center space-x-1 text-xs text-[var(--color-muted)] mb-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Joined</span>
                          </div>
                          <p className="text-sm font-bold text-[var(--color-foreground)]">{getRelativeTime(user.createdAt)}</p>
                        </div>
                        
                        <div className="bg-[var(--color-secondary)]/80 rounded-lg px-2 py-1.5">
                          <div className="flex items-center space-x-1 text-xs text-[var(--color-muted)] mb-0.5">
                            <Activity className="w-3 h-3" />
                            <span>Last Seen</span>
                          </div>
                          <p className="text-sm font-bold text-[var(--color-foreground)]">{getRelativeTime(user.updatedAt)}</p>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-muted)]/10">
                        <div className="flex items-center space-x-1 text-xs">
                          {user.emailVerified && (
                            <div className="px-2 py-1 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30">
                              Email Verified
                            </div>
                          )}
                          {user.phoneVerified && (
                            <div className="px-2 py-1 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30">
                              Phone Verified
                            </div>
                          )}
                          {user.twoFactorEnabled && (
                            <div className="px-2 py-1 rounded bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/30">
                              2FA Enabled
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding for navigation */}
        <div className="h-20" />

        {/* Responsive User Actions Modal */}
        {selectedUser && (() => {
          const user = filteredUsers.find(u => u._id === selectedUser);
          if (!user) return null;

          return (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                onClick={() => setSelectedUser(null)}
              />

              {/* Desktop: Dropdown Menu (hidden on mobile) */}
              <div className="hidden md:block">
                <div 
                  className="fixed z-50"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="bg-[var(--color-secondary)]/95 backdrop-blur-md border border-[var(--color-muted)]/10 rounded-xl shadow-2xl overflow-hidden min-w-[320px]">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-[var(--color-muted)]/10 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10">
                      <div className="flex items-center gap-3">
                        {user.profilePicture ? (
                          <img 
                            src={user.profilePicture} 
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-10 h-10 rounded-lg object-cover border border-[var(--color-muted)]/10"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-info)]/20 border border-[var(--color-muted)]/10">
                            <span className="text-sm font-bold text-[var(--color-foreground)]">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[var(--color-foreground)] text-sm truncate">
                            {user.firstName} {user.lastName}
                          </h4>
                          <p className="text-xs text-[var(--color-muted)] truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-2">
                      {user.role === 'client' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-foreground)]"
                          >
                            {user.isActive ? <UserX className="w-4 h-4 text-[var(--color-warning)]" /> : <UserPlus className="w-4 h-4 text-[var(--color-success)]" />}
                            <span>{user.isActive ? 'Deactivate Account' : 'Activate Account'}</span>
                          </button>

                          {!user.isBanned ? (
                            <button
                              onClick={() => handleBanUser(user._id)}
                              className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-error)]"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Ban User</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnbanUser(user._id)}
                              className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-success)]/10 active:bg-[var(--color-success)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-success)]"
                            >
                              <Unlock className="w-4 h-4" />
                              <span>Unban User</span>
                            </button>
                          )}

                          <div className="border-t border-[var(--color-muted)]/10 my-2"></div>

                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-error)]"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Permanently</span>
                          </button>
                        </>
                      )}

                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-foreground)]"
                          >
                            {user.isActive ? <UserX className="w-4 h-4 text-[var(--color-warning)]" /> : <UserPlus className="w-4 h-4 text-[var(--color-success)]" />}
                            <span>{user.isActive ? 'Deactivate Account' : 'Activate Account'}</span>
                          </button>

                          <div className="border-t border-[var(--color-muted)]/10 my-2"></div>

                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/15 rounded-lg flex items-center gap-3 text-sm transition-colors text-[var(--color-error)]"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Permanently</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Cancel Button */}
                    <div className="px-2 pb-2">
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="w-full px-4 py-2 bg-[var(--color-muted)]/5 hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 border border-[var(--color-muted)]/10 rounded-lg text-[var(--color-foreground)] text-sm font-medium transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile: Bottom Sheet */}
              <div className="block md:hidden">
                <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                  <div className="bg-[var(--color-secondary)]/95 backdrop-blur-md border-t border-[var(--color-muted)]/10 rounded-t-3xl shadow-2xl">
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-12 h-1.5 bg-[var(--color-muted)]/20 rounded-full" />
                    </div>

                    {/* User Info Header */}
                    <div className="px-4 pb-3 border-b border-[var(--color-muted)]/10">
                      <div className="flex items-center gap-3">
                        {user.profilePicture ? (
                          <img 
                            src={user.profilePicture} 
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-lg object-cover border border-[var(--color-muted)]/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-info)]/20 border border-[var(--color-muted)]/10">
                            <span className="text-base font-bold text-[var(--color-foreground)]">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--color-foreground)] text-sm truncate">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-xs text-[var(--color-muted)] truncate">{user.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {user.role === 'client' ? (
                              <div className="px-2 py-0.5 rounded-full bg-[var(--color-info)]/20 text-[var(--color-info)] text-xs font-medium">
                                Client
                              </div>
                            ) : (
                              <div className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)] text-xs font-medium">
                                Admin
                              </div>
                            )}
                            {user.isBanned && (
                              <div className="px-2 py-0.5 rounded-full bg-[var(--color-error)]/20 text-[var(--color-error)] text-xs font-medium">
                                Banned
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 space-y-2">
                      {user.role === 'client' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className="w-full px-4 py-3.5 bg-[var(--color-secondary)]/60 hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 border border-[var(--color-muted)]/10 rounded-xl text-[var(--color-foreground)] flex items-center gap-3 transition-all touch-manipulation"
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-5 h-5 text-[var(--color-warning)]" />
                                <span className="font-medium">Deactivate Account</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-5 h-5 text-[var(--color-success)]" />
                                <span className="font-medium">Activate Account</span>
                              </>
                            )}
                          </button>

                          {!user.isBanned ? (
                            <button
                              onClick={() => handleBanUser(user._id)}
                              className="w-full px-4 py-3.5 bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 active:bg-[var(--color-error)]/30 border border-[var(--color-error)]/30 rounded-xl text-[var(--color-error)] flex items-center gap-3 transition-all touch-manipulation"
                            >
                              <Ban className="w-5 h-5" />
                              <span className="font-medium">Ban User</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnbanUser(user._id)}
                              className="w-full px-4 py-3.5 bg-[var(--color-success)]/10 hover:bg-[var(--color-success)]/20 active:bg-[var(--color-success)]/30 border border-[var(--color-success)]/30 rounded-xl text-[var(--color-success)] flex items-center gap-3 transition-all touch-manipulation"
                            >
                              <Unlock className="w-5 h-5" />
                              <span className="font-medium">Unban User</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="w-full px-4 py-3.5 bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 active:bg-[var(--color-error)]/30 border border-[var(--color-error)]/30 rounded-xl text-[var(--color-error)] flex items-center gap-3 transition-all touch-manipulation"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span className="font-medium">Delete Permanently</span>
                          </button>
                        </>
                      )}

                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className="w-full px-4 py-3.5 bg-[var(--color-secondary)]/60 hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 border border-[var(--color-muted)]/10 rounded-xl text-[var(--color-foreground)] flex items-center gap-3 transition-all touch-manipulation"
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-5 h-5 text-[var(--color-warning)]" />
                                <span className="font-medium">Deactivate Account</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-5 h-5 text-[var(--color-success)]" />
                                <span className="font-medium">Activate Account</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="w-full px-4 py-3.5 bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 active:bg-[var(--color-error)]/30 border border-[var(--color-error)]/30 rounded-xl text-[var(--color-error)] flex items-center gap-3 transition-all touch-manipulation"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span className="font-medium">Delete Permanently</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Cancel Button */}
                    <div className="px-4 pb-6 pt-2">
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="w-full px-4 py-3 bg-[var(--color-muted)]/5 hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/15 border border-[var(--color-muted)]/10 rounded-xl text-[var(--color-foreground)] font-medium transition-all touch-manipulation"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Confirmation Modal */}
        <CustomerConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setConfirmationAction(() => () => {});
          }}
          onConfirm={confirmationAction}
          title={confirmationModalProps.title}
          message={confirmationModalProps.message}
          type={confirmationModalProps.type}
        />
      </div>
    </div>
  );
}