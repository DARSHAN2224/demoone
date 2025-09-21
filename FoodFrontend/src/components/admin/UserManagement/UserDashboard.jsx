import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Shield, 
  Settings, 
  Search, 
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import UserStats from './UserStats';
import UserFilters from './UserFilters';
import UserList from './UserList';
import UserDetails from './UserDetails';
import CreateUserModal from './CreateUserModal';

const UserDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showUserAnalytics, setShowUserAnalytics] = useState(false);
  const [showUserImport, setShowUserImport] = useState(false);
  const [showUserExport, setShowUserExport] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    verified: 0,
    unverified: 0,
    todayRegistered: 0,
    weeklyRegistered: 0,
    monthlyRegistered: 0,
    premiumUsers: 0,
    newUsers: 0,
    churnedUsers: 0
  });

  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    verificationStatus: 'all',
    dateRange: 'all',
    searchQuery: '',
    location: 'all',
    ageRange: 'all',
    activityLevel: 'all',
    subscriptionType: 'all',
    lastLoginRange: 'all'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    setIsLoading(true);
    
    try {
      // This would call the backend API
      const mockUsers = generateMockUsers();
      setUsers(mockUsers);
      
      toast.success('Users loaded successfully');
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Verification status filter
    if (filters.verificationStatus !== 'all') {
      filtered = filtered.filter(user => user.isVerified === (filters.verificationStatus === 'verified'));
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const userDate = new Date(user.createdAt);
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(user => 
            userDate.toDateString() === now.toDateString()
          );
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(user => userDate >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(user => userDate >= monthAgo);
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(user => userDate >= yearAgo);
          break;
        default:
          break;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.mobile.includes(query) ||
        user.address?.toLowerCase().includes(query)
      );
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(user => 
        user.address?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Age range filter
    if (filters.ageRange !== 'all') {
      filtered = filtered.filter(user => {
        if (!user.dateOfBirth) return false;
        const age = calculateAge(user.dateOfBirth);
        switch (filters.ageRange) {
          case '18-25': return age >= 18 && age <= 25;
          case '26-35': return age >= 26 && age <= 35;
          case '36-50': return age >= 36 && age <= 50;
          case '50+': return age > 50;
          default: return true;
        }
      });
    }

    // Activity level filter
    if (filters.activityLevel !== 'all') {
      filtered = filtered.filter(user => {
        const lastLogin = new Date(user.lastLogin || 0);
        const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
        
        switch (filters.activityLevel) {
          case 'active': return daysSinceLogin <= 7;
          case 'moderate': return daysSinceLogin > 7 && daysSinceLogin <= 30;
          case 'inactive': return daysSinceLogin > 30;
          default: return true;
        }
      });
    }

    // Subscription type filter
    if (filters.subscriptionType !== 'all') {
      filtered = filtered.filter(user => user.subscriptionType === filters.subscriptionType);
    }

    // Last login range filter
    if (filters.lastLoginRange !== 'all') {
      filtered = filtered.filter(user => {
        const lastLogin = new Date(user.lastLogin || 0);
        const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
        
        switch (filters.lastLoginRange) {
          case 'today': return daysSinceLogin === 0;
          case 'week': return daysSinceLogin <= 7;
          case 'month': return daysSinceLogin <= 30;
          case 'never': return !user.lastLogin;
          default: return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  // Enhanced user management functions
  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users for bulk action');
      return;
    }

    try {
      switch (bulkAction) {
        case 'activate':
          await bulkUpdateUserStatus(selectedUsers, 'active');
          break;
        case 'deactivate':
          await bulkUpdateUserStatus(selectedUsers, 'inactive');
          break;
        case 'suspend':
          await bulkUpdateUserStatus(selectedUsers, 'suspended');
          break;
        case 'verify':
          await bulkVerifyUsers(selectedUsers);
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
            await bulkDeleteUsers(selectedUsers);
          }
          break;
        case 'export':
          await exportSelectedUsers(selectedUsers);
          break;
        default:
          break;
      }
      
      setSelectedUsers([]);
      setBulkAction('');
      setShowBulkActions(false);
    } catch (error) {
      toast.error('Bulk action failed');
      console.error('Error in bulk action:', error);
    }
  };

  const bulkUpdateUserStatus = async (userIds, status) => {
    // Update user status in backend
    const updatedUsers = users.map(user => 
      userIds.includes(user._id) ? { ...user, status } : user
    );
    setUsers(updatedUsers);
    toast.success(`${userIds.length} users ${status} successfully`);
  };

  const bulkVerifyUsers = async (userIds) => {
    // Verify users in backend
    const updatedUsers = users.map(user => 
      userIds.includes(user._id) ? { ...user, isVerified: true } : user
    );
    setUsers(updatedUsers);
    toast.success(`${userIds.length} users verified successfully`);
  };

  const bulkDeleteUsers = async (userIds) => {
    // Delete users from backend
    const updatedUsers = users.filter(user => !userIds.includes(user._id));
    setUsers(updatedUsers);
    toast.success(`${userIds.length} users deleted successfully`);
  };

  const exportSelectedUsers = async (userIds) => {
    const selectedUserData = users.filter(user => userIds.includes(user._id));
    const csvContent = convertToCSV(selectedUserData);
    downloadCSV(csvContent, 'selected_users.csv');
    toast.success('Users exported successfully');
  };

  const exportAllUsers = async () => {
    const csvContent = convertToCSV(filteredUsers);
    downloadCSV(csvContent, 'all_users.csv');
    toast.success('All users exported successfully');
  };

  const convertToCSV = (userData) => {
    const headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Verified', 'Created At', 'Last Login'];
    const rows = userData.map(user => [
      user.name,
      user.email,
      user.mobile,
      user.role,
      user.status,
      user.isVerified ? 'Yes' : 'No',
      new Date(user.createdAt).toLocaleDateString(),
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const generateMockUsers = () => {
    return Array.from({ length: 50 }, (_, index) => ({
      _id: `user_${index + 1}`,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      mobile: `98765${String(index + 1).padStart(5, '0')}`,
      role: index % 3 === 0 ? 'admin' : index % 3 === 1 ? 'seller' : 'user',
      status: index % 4 === 0 ? 'active' : index % 4 === 1 ? 'inactive' : index % 4 === 2 ? 'suspended' : 'pending',
      isVerified: index % 5 !== 0,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: index % 3 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      address: `Address ${index + 1}, City ${index % 10 + 1}`,
      dateOfBirth: new Date(1990 + (index % 30), index % 12, index % 28 + 1).toISOString(),
      subscriptionType: index % 4 === 0 ? 'premium' : index % 4 === 1 ? 'basic' : 'free',
      profileImage: index % 3 === 0 ? `/profile-${index + 1}.jpg` : null,
      preferences: {
        notifications: index % 2 === 0,
        marketing: index % 3 === 0,
        language: index % 2 === 0 ? 'en' : 'es'
      },
      metrics: {
        totalOrders: Math.floor(Math.random() * 100),
        totalSpent: Math.floor(Math.random() * 1000),
        averageOrderValue: Math.floor(Math.random() * 50) + 10,
        lastOrderDate: index % 2 === 0 ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() : null
      }
    }));
  };

  // Enhanced user management functions
  const handleUserAction = async (userId, action, data = {}) => {
    try {
      // This would call the backend API
      const updatedUsers = users.map(user => {
        if (user._id === userId) {
          return { ...user, ...data };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      toast.success(`User ${action} successfully`);
      
      // Update selected user if it's the one being modified
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(updatedUsers.find(u => u._id === userId));
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`);
      console.error(`Error ${action} user:`, error);
    }
  };

  const createUser = async (userData) => {
    try {
      // This would call the backend API
      const newUser = {
        _id: Date.now().toString(),
        ...userData,
        status: 'active',
        isVerified: false,
        createdAt: new Date(),
        lastLogin: null,
        loginCount: 0
      };
      
      setUsers(prev => [newUser, ...prev]);
      setShowCreateModal(false);
      toast.success('User created successfully');
    } catch (error) {
      toast.error('Failed to create user');
      console.error('Error creating user:', error);
    }
  };

  const updateStats = (userList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newStats = {
      total: userList.length,
      active: userList.filter(user => user.status === 'active').length,
      inactive: userList.filter(user => user.status === 'inactive').length,
      suspended: userList.filter(user => user.status === 'suspended').length,
      verified: userList.filter(user => user.isVerified).length,
      unverified: userList.filter(user => !user.isVerified).length,
      todayRegistered: userList.filter(user => new Date(user.createdAt) >= today).length,
      weeklyRegistered: userList.filter(user => new Date(user.createdAt) >= weekAgo).length,
      monthlyRegistered: userList.filter(user => new Date(user.createdAt) >= monthAgo).length,
      premiumUsers: userList.filter(user => user.subscriptionType === 'premium').length,
      newUsers: userList.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= weekAgo;
      }).length,
      churnedUsers: userList.filter(user => {
        if (!user.lastLogin) return false;
        const lastLogin = new Date(user.lastLogin);
        return lastLogin < monthAgo;
      }).length
    };
    
    setStats(newStats);
  };

  useEffect(() => {
    updateStats(filteredUsers);
  }, [filteredUsers]);

  const handleUserSelection = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user._id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-primary-600" />
                User Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage user accounts, permissions, and system access
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUserAnalytics(!showUserAnalytics)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setShowUserImport(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Import
              </button>
              <button
                onClick={exportAllUsers}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Export All
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <UserPlus className="h-4 w-4" />
                Create User
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <UserStats stats={stats} />

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-primary-800 font-medium">
                {selectedUsers.length} users selected
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="border border-blue-300 rounded px-3 py-1 text-sm"
                >
                  <option value="">Select action...</option>
                  <option value="activate">Activate</option>
                  <option value="deactivate">Deactivate</option>
                  <option value="suspend">Suspend</option>
                  <option value="verify">Verify</option>
                  <option value="delete">Delete</option>
                  <option value="export">Export Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <UserFilters 
          filters={filters} 
          setFilters={setFilters}
          onSearch={(query) => setFilters(prev => ({ ...prev, searchQuery: query }))}
        />

                 {/* User List */}
         <UserList
           users={filteredUsers}
           selectedUsers={selectedUsers}
           onUserSelect={handleUserSelection}
           onSelectAll={selectAllUsers}
           onUserAction={handleUserAction}
           onUserDetails={setSelectedUser}
         />

        {/* User Details Modal */}
        {selectedUser && (
          <UserDetails
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={(data) => handleUserAction(selectedUser._id, 'update', data)}
          />
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onCreate={createUser}
          />
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
