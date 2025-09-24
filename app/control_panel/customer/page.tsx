'use client';

import { useState, useMemo } from 'react';
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
import { formatDate, getRelativeTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

export default function CustomerManagement() {
  const router = useRouter();

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
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {});
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

  const showConfirmation = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    action?: () => void
  ) => {
    setConfirmationModalProps({ title, message, type });
    if (action) {
      setConfirmationAction(() => action);
    }
    setShowConfirmationModal(true);
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
    const active = users.filter(u => u.isActive).length;
    const inactive = users.filter(u => !u.isActive).length;
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
    try {
      await toggleUserStatus({
        userId: userId as Id<'users'>,
        isActive: !currentStatus,
      });
      showConfirmation('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (error) {
      console.error('Error toggling user status:', error);
      showConfirmation('Error', 'Failed to update user status.', 'error');
    }
    setSelectedUser(null);
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

  const handleResetPassword = async (userId: string) => {
    showConfirmation(
      'Reset Password',
      'Send a password reset link to this user?',
      'info',
      async () => {
        try {
          await resetUserPassword({ userId: userId as Id<'users'> });
          showConfirmation('Success', 'Password reset link sent!', 'success');
        } catch (error) {
          console.error('Error resetting password:', error);
          showConfirmation('Error', 'Failed to reset password.', 'error');
        }
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

  const handleExportUsers = () => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Super Admin Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-white">Customer Management</h1>
                  <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
                    SUPER ADMIN
                  </div>
                </div>
                <p className="text-sm text-white/60">Complete control over all user accounts</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportUsers}
                className="px-4 py-2 rounded-lg bg-success/10 border border-success/20 text-success flex items-center space-x-2 hover:bg-success/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
              
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-4 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center space-x-2 hover:bg-warning/20 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Bulk Actions</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center space-x-2 hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by name, email, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard for Super Admin */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary">TOTAL</span>
            </div>
            <p className="text-2xl font-bold text-white">{userStats.total}</p>
            <p className="text-xs text-white/60">All Users</p>
          </div>

          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-success/10">
                <UserCheck className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs font-bold text-success">ACTIVE</span>
            </div>
            <p className="text-2xl font-bold text-white">{userStats.active}</p>
            <p className="text-xs text-white/60">{Math.round(userStats.active / userStats.total * 100)}% of total</p>
          </div>

          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-warning/10">
                <Shield className="w-4 h-4 text-warning" />
              </div>
              <span className="text-xs font-bold text-warning">STAFF</span>
            </div>
            <p className="text-2xl font-bold text-white">{userStats.admins + userStats.superAdmins}</p>
            <p className="text-xs text-white/60">{userStats.admins} Admin, {userStats.superAdmins} Super</p>
          </div>

          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-info/10">
                <TrendingUp className="w-4 h-4 text-info" />
              </div>
              <span className="text-xs font-bold text-info">NEW</span>
            </div>
            <p className="text-2xl font-bold text-white">{userStats.newThisMonth}</p>
            <p className="text-xs text-white/60">This month</p>
          </div>

          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs font-bold text-purple-500">REVENUE</span>
            </div>
            <p className="text-lg font-bold text-white">{formatCurrency(userStats.totalRevenue)}</p>
            <p className="text-xs text-white/60">Total lifetime</p>
          </div>

          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-error/10">
                <Ban className="w-4 h-4 text-error" />
              </div>
              <span className="text-xs font-bold text-error">ISSUES</span>
            </div>
            <p className="text-2xl font-bold text-white">{userStats.inactive + userStats.banned}</p>
            <p className="text-xs text-white/60">{userStats.inactive} inactive, {userStats.banned} banned</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters for Super Admin */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Role</label>
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
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent text-white'
                        : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-purple-500/50'
                    }`}
                  >
                    <span>{role.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      selectedRole === role.value
                        ? 'bg-white/20'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {role.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
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
                        ? `bg-${status.color || 'info'} border-${status.color || 'info'} text-white`
                        : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                    }`}
                  >
                    <span>{status.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      selectedStatus === status.value
                        ? 'bg-white/20'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {status.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Method Filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Login Method</label>
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
                        ? 'bg-info border-info text-white'
                        : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-info/20'
                    }`}
                  >
                    <span>{method.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      selectedLoginMethod === method.value
                        ? 'bg-white/20'
                        : 'bg-info/10 text-info'
                    }`}>
                      {method.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center space-x-1"
            >
              <ChevronDown className={`w-4 h-4 transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              <span>{showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-b border-white/10 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                onChange={selectAllUsers}
                className="w-4 h-4 rounded border-white/20 bg-secondary/40 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-white">
                {selectedUsers.size === 0 
                  ? 'Select users' 
                  : `${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''} selected`}
              </span>
            </div>
            
            {selectedUsers.size > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-success text-xs hover:bg-success/20"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs hover:bg-warning/20"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('ban')}
                  className="px-3 py-1.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs hover:bg-error/20"
                >
                  Ban
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 rounded-lg bg-error border border-error text-white text-xs hover:bg-error/80"
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
          <h2 className="text-lg font-bold text-white">
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
              className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {!users ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 animate-spin text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading customers...</h3>
            <p className="text-white/60">Fetching user data from the database.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No customers found</h3>
            <p className="text-white/60 mb-6">
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
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors"
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
                className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:border-purple-500/30 ${
                  user.isBanned 
                    ? 'border-error/50 bg-error/5' 
                    : !user.isActive
                    ? 'border-warning/30 bg-warning/5'
                    : user.role === 'super_admin'
                    ? 'border-purple-500/30 bg-gradient-to-r from-purple-900/10 to-pink-900/10'
                    : user.role === 'admin'
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-white/10'
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
                        className="w-4 h-4 rounded border-white/20 bg-secondary/40 text-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Enhanced User Avatar with Status Indicators */}
                  <div className="relative flex-shrink-0">
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-16 h-16 rounded-lg object-cover border border-white/10"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center border ${
                        user.role === 'super_admin'
                          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30'
                          : user.role === 'admin'
                          ? 'bg-gradient-to-br from-warning/20 to-orange-500/20 border-warning/30'
                          : 'bg-gradient-to-br from-primary/20 to-info/20 border-white/10'
                      }`}>
                        <span className="text-lg font-bold text-white">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    )}
                    
                    {/* Role Badge */}
                    {user.role === 'super_admin' && (
                      <div className="absolute -top-1 -right-1 p-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                        <ShieldCheck className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {user.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 p-1 rounded-full bg-warning">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {user.isBanned && (
                      <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-error">
                        <Ban className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    {/* Online Status Indicator */}
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-success border-2 border-secondary"></div>
                    )}
                  </div>

                  {/* Enhanced User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-bold text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          
                          {/* Status Badges */}
                          <div className="flex items-center space-x-1">
                            {user.role === 'super_admin' && (
                              <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
                                SUPER ADMIN
                              </div>
                            )}
                            {user.role === 'admin' && !user.role.includes('super') && (
                              <div className="px-2 py-0.5 rounded-full bg-warning text-white text-xs font-bold">
                                ADMIN
                              </div>
                            )}
                            {user.isBanned && (
                              <div className="px-2 py-0.5 rounded-full bg-error text-white text-xs font-bold">
                                BANNED
                              </div>
                            )}
                            {!user.isActive && !user.isBanned && (
                              <div className="px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 text-xs font-medium">
                                Inactive
                              </div>
                            )}
                            {user.isVerified && (
                              <div className="px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/30 text-xs font-medium">
                                Verified
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Contact Information */}
                        <div className="space-y-1 text-sm text-white/60">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                            {user.loginMethod === 'facebook' && (
                              <div className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
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

                      {/* Super Admin Actions Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setSelectedUser(selectedUser === user._id ? null : user._id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-white/60" />
                        </button>

                        {selectedUser === user._id && (
                          <div className="absolute right-0 top-8 w-56 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                            <div className="py-1">
                              <button
                                onClick={() => router.push(`/control_panel/customers/${user._id}`)}
                                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Full Profile</span>
                              </button>
                              
                              <button
                                onClick={() => router.push(`/control_panel/customers/${user._id}/edit`)}
                                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit Profile</span>
                              </button>

                              <div className="border-t border-white/10 my-1"></div>

                              {/* Role Management */}
                              {user.role !== 'super_admin' && (
                                <>
                                  {user.role === 'client' && (
                                    <button
                                      onClick={() => handleChangeUserRole(user._id, 'admin')}
                                      className="w-full px-4 py-2 text-left text-warning hover:bg-warning/10 flex items-center space-x-2"
                                    >
                                      <Shield className="w-4 h-4" />
                                      <span>Promote to Admin</span>
                                    </button>
                                  )}
                                  {user.role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => handleChangeUserRole(user._id, 'super_admin')}
                                        className="w-full px-4 py-2 text-left text-purple-400 hover:bg-purple-500/10 flex items-center space-x-2"
                                      >
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Promote to Super Admin</span>
                                      </button>
                                      <button
                                        onClick={() => handleChangeUserRole(user._id, 'client')}
                                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                      >
                                        <User className="w-4 h-4" />
                                        <span>Demote to Client</span>
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              <div className="border-t border-white/10 my-1"></div>

                              {/* Account Actions */}
                              <button
                                onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                              >
                                {user.isActive ? <UserX className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                <span>{user.isActive ? 'Deactivate Account' : 'Activate Account'}</span>
                              </button>

                              {!user.isBanned ? (
                                <button
                                  onClick={() => handleBanUser(user._id)}
                                  className="w-full px-4 py-2 text-left text-orange-400 hover:bg-orange-500/10 flex items-center space-x-2"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Ban User</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnbanUser(user._id)}
                                  className="w-full px-4 py-2 text-left text-success hover:bg-success/10 flex items-center space-x-2"
                                >
                                  <Unlock className="w-4 h-4" />
                                  <span>Unban User</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleResetPassword(user._id)}
                                className="w-full px-4 py-2 text-left text-info hover:bg-info/10 flex items-center space-x-2"
                              >
                                <Lock className="w-4 h-4" />
                                <span>Reset Password</span>
                              </button>

                              <div className="border-t border-white/10 my-1"></div>

                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Permanently</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Metrics and Activity */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="bg-black/20 rounded-lg px-2 py-1.5">
                        <div className="flex items-center space-x-1 text-xs text-white/60 mb-0.5">
                          <ShoppingBag className="w-3 h-3" />
                          <span>Orders</span>
                        </div>
                        <p className="text-sm font-bold text-white">{user.totalOrders || 0}</p>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg px-2 py-1.5">
                        <div className="flex items-center space-x-1 text-xs text-white/60 mb-0.5">
                          <DollarSign className="w-3 h-3" />
                          <span>Spent</span>
                        </div>
                        <p className="text-sm font-bold text-white">{formatCurrency(user.totalSpent || 0)}</p>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg px-2 py-1.5">
                        <div className="flex items-center space-x-1 text-xs text-white/60 mb-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Joined</span>
                        </div>
                        <p className="text-sm font-bold text-white">{getRelativeTime(user.createdAt)}</p>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg px-2 py-1.5">
                        <div className="flex items-center space-x-1 text-xs text-white/60 mb-0.5">
                          <Activity className="w-3 h-3" />
                          <span>Last Seen</span>
                        </div>
                        <p className="text-sm font-bold text-white">{getRelativeTime(user.updatedAt)}</p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-1 text-xs">
                        {user.emailVerified && (
                          <div className="px-2 py-1 rounded bg-success/10 text-success border border-success/30">
                            Email Verified
                          </div>
                        )}
                        {user.phoneVerified && (
                          <div className="px-2 py-1 rounded bg-success/10 text-success border border-success/30">
                            Phone Verified
                          </div>
                        )}
                        {user.twoFactorEnabled && (
                          <div className="px-2 py-1 rounded bg-info/10 text-info border border-info/30">
                            2FA Enabled
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/control_panel/customers/${user._id}`)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 text-xs hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
                        >
                          Manage
                        </button>
                        
                        {user.role === 'client' && (
                          <button
                            onClick={() => router.push(`/control_panel/customers/${user._id}/orders`)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 transition-colors"
                          >
                            Orders
                          </button>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setConfirmationAction(() => {});
        }}
        onConfirm={() => {
          confirmationAction();
          setShowConfirmationModal(false);
        }}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />
    </div>
  );
}

// Helper functions for Super Admin actions
function handleBanUser(userId: string) {
  console.log('Ban user:', userId);
}

function handleUnbanUser(userId: string) {
  console.log('Unban user:', userId);
}