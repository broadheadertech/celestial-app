'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Bell
} from 'lucide-react';
import { formatDate, getRelativeTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { User as UserType } from '@/types';

// Mock users data
const mockUsers: UserType[] = [
  {
    _id: '1',
    email: 'john.doe@gmail.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+63 912 345 6789',
    role: 'client',
    isActive: true,
    createdAt: Date.now() - 2592000000, // 30 days ago
    updatedAt: Date.now() - 86400000, // 1 day ago
  },
  {
    _id: '2',
    email: 'jane.smith@gmail.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+63 917 234 5678',
    role: 'client',
    isActive: true,
    createdAt: Date.now() - 1296000000, // 15 days ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
  },
  {
    _id: '3',
    email: 'admin@celestial.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+63 999 888 7777',
    role: 'admin',
    isActive: true,
    createdAt: Date.now() - 7776000000, // 90 days ago
    updatedAt: Date.now() - 172800000, // 2 days ago
  },
  {
    _id: '4',
    email: 'maria.garcia@yahoo.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    role: 'client',
    isActive: false, // Inactive user
    createdAt: Date.now() - 5184000000, // 60 days ago
    updatedAt: Date.now() - 2592000000, // 30 days ago
  },
  {
    _id: '5',
    email: 'robert.chen@gmail.com',
    firstName: 'Robert',
    lastName: 'Chen',
    phone: '+63 920 111 2222',
    role: 'client',
    isActive: true,
    createdAt: Date.now() - 604800000, // 7 days ago
    updatedAt: Date.now() - 1800000, // 30 minutes ago
  },
];

// Mock user activity data
const mockUserActivity: Record<string, { orders: number; reservations: number; totalSpent: number }> = {
  '1': { orders: 5, reservations: 3, totalSpent: 2450.00 },
  '2': { orders: 8, reservations: 2, totalSpent: 3200.50 },
  '3': { orders: 0, reservations: 0, totalSpent: 0 }, // Admin
  '4': { orders: 2, reservations: 1, totalSpent: 850.00 },
  '5': { orders: 1, reservations: 1, totalSpent: 450.00 },
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Calculate stats
  const userStats = useMemo(() => {
    const total = mockUsers.length;
    const active = mockUsers.filter(u => u.isActive).length;
    const inactive = mockUsers.filter(u => !u.isActive).length;
    const admins = mockUsers.filter(u => u.role === 'admin').length;
    const clients = mockUsers.filter(u => u.role === 'client').length;
    const newThisMonth = mockUsers.filter(u => u.createdAt > Date.now() - 2592000000).length;

    return { total, active, inactive, admins, clients, newThisMonth };
  }, []);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = mockUsers;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(searchQuery))
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedRole, selectedStatus]);

  const handleToggleUserStatus = (userId: string) => {
    // TODO: Implement API call to toggle user status
    console.log('Toggle status for user:', userId);
    setSelectedUser(null);
  };

  const handleToggleUserRole = (userId: string) => {
    // TODO: Implement API call to toggle user role
    console.log('Toggle role for user:', userId);
    setSelectedUser(null);
  };

  const handleDeleteUser = (userId: string) => {
    // TODO: Implement API call to delete user
    console.log('Delete user:', userId);
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">Users</h1>
              <p className="text-sm text-muted">{filteredUsers.length} users</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-white/10 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-xl bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-success">{userStats.active}</p>
            <p className="text-xs text-muted">Active</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-primary">{userStats.clients}</p>
            <p className="text-xs text-muted">Clients</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-warning">{userStats.admins}</p>
            <p className="text-xs text-muted">Admins</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-info">{userStats.newThisMonth}</p>
            <p className="text-xs text-muted">New</p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary border-b border-white/10 px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'client', label: 'Clients' },
                  { value: 'admin', label: 'Admins' },
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedRole === role.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="px-6 py-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
            <p className="text-muted mb-6">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const activity = mockUserActivity[user._id] || { orders: 0, reservations: 0, totalSpent: 0 };

              return (
                <Card key={user._id} className="relative">
                  <div className="flex space-x-4">
                    {/* User Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white">
                              {user.firstName} {user.lastName}
                            </h3>
                            <div className="flex items-center space-x-1">
                              {user.role === 'admin' && (
                                <Shield className="w-4 h-4 text-warning" />
                              )}
                              {!user.isActive && (
                                <span className="px-2 py-0.5 bg-error/20 text-error text-xs rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1 text-sm text-muted">
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
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Joined {getRelativeTime(user.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setSelectedUser(selectedUser === user._id ? null : user._id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-muted" />
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
                                  onClick={() => handleToggleUserStatus(user._id)}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                >
                                  {user.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                  <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                {user.role === 'client' && (
                                  <button
                                    onClick={() => handleToggleUserRole(user._id)}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Shield className="w-4 h-4" />
                                    <span>Make Admin</span>
                                  </button>
                                )}
                                {user.role === 'admin' && (
                                  <button
                                    onClick={() => handleToggleUserRole(user._id)}
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

                      {/* User Activity */}
                      {user.role === 'client' && (
                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/10">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-white">{activity.orders}</p>
                            <p className="text-xs text-muted">Orders</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-white">{activity.reservations}</p>
                            <p className="text-xs text-muted">Reservations</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-white">₱{activity.totalSpent.toLocaleString()}</p>
                            <p className="text-xs text-muted">Total Spent</p>
                          </div>
                        </div>
                      )}

                      {user.role === 'admin' && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-2 text-sm">
                            <Shield className="w-4 h-4 text-warning" />
                            <span className="text-warning">Administrator Account</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/admin/products')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Products</span>
          </button>
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />

      {/* Click outside to close menu */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}