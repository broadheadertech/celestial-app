'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import BottomNavbar from '@/components/common/BottomNavbar';
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
  RefreshCw
} from 'lucide-react';
import { formatDate, getRelativeTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch real users data
  const users = useQuery(api.services.admin.getAllUsers, { 
    role: selectedRole !== 'all' ? selectedRole : undefined,
    search: searchQuery.trim() || undefined 
  });

  // Mutations for user management
  const toggleUserStatus = useMutation(api.services.admin.toggleUserStatus);
  const updateUserRole = useMutation(api.services.admin.updateUserRole);

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
      console.error('Error toggling user status:', error);
      showConfirmation('Error', 'Error updating user status. Please try again.', 'error');
    }
    setSelectedUser(null);
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'client' : 'admin';
      await updateUserRole({
        userId: userId as Id<'users'>,
        role: newRole as 'admin' | 'client',
      });
      showConfirmation('Success', `User role changed to ${newRole} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating user role:', error);
      showConfirmation('Error', 'Error updating user role. Please try again.', 'error');
    }
    setSelectedUser(null);
  };

  const handleDeleteUser = (userId: string) => {
    // TODO: Implement API call to delete user (if needed)
    console.log('Delete user:', userId);
    showConfirmation('Not Available', 'User deletion not implemented yet.', 'info');
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
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
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <p className="text-sm text-white/60">Manage user accounts and permissions</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
                placeholder="Search users by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10" style={{ minWidth: '120px' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-success/10">
                <Users className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs font-medium text-success">
                {userStats.total} total
              </span>
            </div>
            <p className="text-lg font-bold text-white">{userStats.active}</p>
            <p className="text-xs text-white/60">Active Clients</p>
          </div>
          
          <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10" style={{ minWidth: '120px' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-error/10">
                <User className="w-4 h-4 text-error" />
              </div>
              <span className="text-xs font-medium text-error">
                {userStats.inactive}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{userStats.inactive}</p>
            <p className="text-xs text-white/60">Inactive Clients</p>
          </div>
          
          <div className="flex-shrink-0 bg-secondary/40 backdrop-blur-sm rounded-xl p-3 border border-white/10" style={{ minWidth: '120px' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary">
                This month
              </span>
            </div>
            <p className="text-lg font-bold text-white">{userStats.newThisMonth}</p>
            <p className="text-xs text-white/60">New Clients</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {[
                  { value: 'all', label: 'All Status', count: userStats.total },
                  { value: 'active', label: 'Active', count: userStats.active },
                  { value: 'inactive', label: 'Inactive', count: userStats.inactive },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-info border-info text-white'
                        : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                    }`}
                  >
                    <span>{status.label}</span>
                    <div className={`px-1.5 py-0.5 rounded text-xs ${
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
        </div>
      )}

      {/* Users List */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Users ({filteredUsers.length})
          </h2>
          {filteredUsers.length === 0 && clientOnlyUsers && clientOnlyUsers.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('all');
                setSelectedStatus('all');
              }}
              className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {!users ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading users...</h3>
            <p className="text-white/60">Please wait while we fetch user data.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No users found</h3>
            <p className="text-white/60 mb-6 text-center">
              {!clientOnlyUsers || clientOnlyUsers.length === 0
                ? 'No clients have been registered yet.'
                : 'Try adjusting your search terms or filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              // Double-check to ensure only client users are displayed
              if (user.role !== 'client') return null;
              
              return (
                <div
                  key={user._id}
                  className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:border-primary/30 ${
                    !user.isActive 
                      ? 'border-error/30 bg-error/5' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex space-x-4">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center border border-white/10">
                        <span className="text-lg font-bold text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      {user.role === 'admin' && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-warning">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-white">
                              {user.firstName} {user.lastName}
                            </h3>
                            {!user.isActive && (
                              <div className="px-2 py-1 rounded-lg bg-error/10 text-error border border-error/30">
                                <span className="text-xs font-medium">Inactive</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-white/60">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setSelectedUser(selectedUser === user._id ? null : user._id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-white/60" />
                          </button>

                          {selectedUser === user._id && (
                            <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => router.push(`/admin/users/${user._id}`)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  {user.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                  <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                {user.role === 'client' && (
                                  <button
                                    onClick={() => handleToggleUserRole(user._id, user.role)}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Shield className="w-4 h-4" />
                                    <span>Make Admin</span>
                                  </button>
                                )}
                                {user.role === 'admin' && (
                                  <button
                                    onClick={() => handleToggleUserRole(user._id, user.role)}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <User className="w-4 h-4" />
                                    <span>Make Client</span>
                                  </button>
                                )}
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete User</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* User Stats and Info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-warning/10 text-warning border border-warning/30'
                              : 'bg-primary/10 text-primary border border-primary/30'
                          }`}>
                            {user.role === 'admin' ? 'Administrator' : 'Client'}
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs text-white/60">
                            <Calendar className="w-3 h-3" />
                            <span>Joined {getRelativeTime(user.createdAt)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          {user.role === 'client' && user.totalOrders > 0 && (
                            <>
                              <p className="text-sm font-medium text-white">
                                {user.totalOrders} orders
                              </p>
                              <p className="text-xs text-white/60">
                                {formatCurrency(user.totalSpent || 0)} spent
                              </p>
                            </>
                          )}
                          {user.role === 'admin' && (
                            <div className="flex items-center space-x-1 text-xs text-warning">
                              <Shield className="w-3 h-3" />
                              <span>Admin Account</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center space-x-1 text-xs text-white/60">
                          <span>Last active:</span>
                          <span>{getRelativeTime(user.updatedAt)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/admin/users/${user._id}`)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 transition-colors"
                          >
                            View
                          </button>
                          
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.isActive ?? false)}
                            className={`px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-colors ${
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Bottom padding for mobile navigation */}
      <div className="h-16 sm:hidden" />

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
        onClose={() => setShowConfirmationModal(false)}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />
    </div>
  );
}