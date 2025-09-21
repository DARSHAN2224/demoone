import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from './stores/authStore';
import { useAppStore, useAppActions } from './stores/appStore';
import { useNotificationStore } from './stores/notificationStore';
import { Toaster } from 'react-hot-toast';

// Components
import UserHeader from './components/layout/UserHeader';
import SellerHeader from './components/layout/SellerHeader';
import AdminHeader from './components/layout/AdminHeader';
import UserFooter from './components/layout/UserFooter';
import SellerFooter from './components/layout/SellerFooter';
import AdminFooter from './components/layout/AdminFooter';
import LoadingSpinner from './components/common/LoadingSpinner';
import Toast from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';

// Auth Components
import EnhancedLogin from './components/auth/EnhancedLogin';
import EnhancedRegister from './components/auth/EnhancedRegister';
import VerifyEmail from './components/auth/VerifyEmail';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// User Components
import UserHome from './components/user/UserHome';
import Shops from './components/user/Shops';
import ShopDetails from './components/user/ShopDetails';
import Cart from './components/user/Cart';
import EnhancedCart from './components/user/EnhancedCart';
import Orders from './components/user/Orders';
import OrderDetail from './components/user/OrderDetail';
import OrderHistory from './components/user/OrderHistory';
import PageViewer from './components/user/PageViewer';
import QRValidation from './components/user/QRValidation';
import Profile from './components/user/Profile';
import UserOffers from './components/user/UserOffers';
import DeliveryTracking from './components/user/DeliveryTracking';

// Seller Components
import SellerDashboard from './components/seller/SellerDashboard';
import SellerAddProduct from './components/seller/SellerAddProduct';
import SellerEditProduct from './components/seller/SellerEditProduct';
import SellerEditShop from './components/seller/SellerEditShop';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import RegularDeliveryDashboard from './components/admin/RegularDeliveryDashboard';
import UserDroneTracking from './components/user/UserDroneTracking';
import ParcelTracking from './components/user/ParcelTracking';
import SellerDroneCoordination from './components/seller/SellerDroneCoordination';
import SellerDroneTracking from './components/seller/SellerDroneTracking';
import AdminDroneFleetManagement from './components/admin/AdminDroneFleetManagement';
import EnhancedDroneTesting from './components/admin/EnhancedDroneTesting';
import AdminPendingProducts from './components/admin/AdminPendingProducts';
import AdminPendingShops from './components/admin/AdminPendingShops';
import AdminSellers from './components/admin/AdminSellers';
import AdminPages from './components/admin/AdminPages';
import AdminDocumentation from './components/admin/AdminDocumentation';

// Common Components
import About from './components/common/About';
import Contact from './components/common/Contact';
import Partner from './components/common/Partner';
import HowItWorks from './components/common/HowItWorks';
import Support from './components/common/Support';
import Terms from './components/common/Terms';
import Privacy from './components/common/Privacy';
import SearchResults from './components/common/SearchResults';
import Documentation from './pages/Documentation';
import UnifiedOrderDashboard from './components/common/UnifiedOrderDashboard';

// Protected Route Component (Industry Standard)
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const location = useLocation();

  console.log('🔍 ProtectedRoute: Checking access for roles:', allowedRoles);
  console.log('🔍 ProtectedRoute: Current user:', user);
  console.log('🔍 ProtectedRoute: Auth state:', { isAuthenticated, isLoading });
  console.log('🔍 ProtectedRoute: Current path:', location.pathname);

  // If still loading, show spinner
  if (isLoading) {
    console.log('🔍 ProtectedRoute: Loading...');
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('🔍 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If user exists but no role specified, allow access
  if (allowedRoles.length === 0) {
    console.log('🔍 ProtectedRoute: No role restrictions, access granted');
    return children;
  }

  // Check role-based access - ensure role is a string for comparison
  const userRole = typeof user?.role === 'string' ? user.role : String(user?.role);
  if (userRole && !allowedRoles.includes(userRole)) {
    console.log('🔍 ProtectedRoute: Role mismatch. User role:', userRole, 'Type:', typeof userRole, 'Allowed roles:', allowedRoles);
    console.log('🔍 ProtectedRoute: User object:', user);
    
    // Redirect to appropriate dashboard based on user role
    const redirectPath = userRole === 'admin' ? '/admin' : 
                        userRole === 'seller' ? '/seller' : '/';
    
    console.log('🔍 ProtectedRoute: Redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  console.log('🔍 ProtectedRoute: Access granted');
  return children;
};

// Smart Home Route Component (Industry Standard)
const SmartHomeRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  
  console.log('🔍 SmartHomeRoute: Checking user role for redirection');
  console.log('🔍 SmartHomeRoute: Auth state:', { isAuthenticated, isLoading, userRole: user?.role });
  
  if (isLoading) {
    console.log('🔍 SmartHomeRoute: Loading...');
    return <LoadingSpinner />;
  }

  // If authenticated, redirect to appropriate dashboard
  if (isAuthenticated && user?.role) {
    const userRole = typeof user.role === 'string' ? user.role : String(user.role);
    const redirectPath = userRole === 'admin' ? '/admin' : 
                        userRole === 'seller' ? '/seller' : '/';
    
    // Only redirect if not already on the correct path
    if (window.location.pathname !== redirectPath) {
      console.log('🔍 SmartHomeRoute: Redirecting authenticated user to:', redirectPath);
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Show public home for unauthenticated users
  console.log('🔍 SmartHomeRoute: Showing public home');
  return <UserHome />;
};

// Unauth-only Route Component (Industry Standard)
const UnauthRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();
  
  console.log('🔍 UnauthRoute: Checking access');
  console.log('🔍 UnauthRoute: Auth state:', { isAuthenticated, isLoading, userRole: user?.role });
  console.log('🔍 UnauthRoute: Current path:', location.pathname);
  
  if (isLoading) {
    console.log('🔍 UnauthRoute: Loading...');
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user?.role) {
    console.log('🔍 UnauthRoute: User authenticated, redirecting to appropriate dashboard');
    
    // Redirect to appropriate dashboard based on user role
    const userRole = typeof user.role === 'string' ? user.role : String(user.role);
    const redirectPath = userRole === 'admin' ? '/admin' : 
                        userRole === 'seller' ? '/seller' : '/';
    
    console.log('🔍 UnauthRoute: Redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  console.log('🔍 UnauthRoute: Access granted (not authenticated)');
  return children;
};

// App Content Component
const AppContent = () => {
  const { checkAuth, isAuthenticated, isLoading, user } = useAuthStore();
  const { getHomeData } = useAppStore();
  const { setTelemetry, setMissionState, setDroneConnection, addNotification } = useAppActions();
  const { fetchNotifications, subscribeLive } = useNotificationStore();
  const location = useLocation();

  useEffect(() => {
    console.log('🔍 App.jsx: Initial auth check');
    checkAuth();
    
    // Add debugging for role detection
    setTimeout(() => {
      console.log('🔍 App.jsx: Delayed role check');
      const { user, isAuthenticated } = useAuthStore.getState();
      console.log('🔍 App.jsx: Current auth state:', { user, isAuthenticated });
      if (user) {
        console.log('🔍 App.jsx: User role details:', {
          role: user.role,
          id: user._id,
          email: user.email
        });
      }
    }, 1000);
  }, [checkAuth]);

  useEffect(() => {
    const handleFocus = () => {
      // Check if user is authenticated but state is not updated
      if (!isAuthenticated) {
        console.log('🔍 Window focused, re-checking auth...');
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAuth, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.role === 'user') {
      getHomeData();
    }
  }, [isAuthenticated, isLoading, user, getHomeData]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const timer = setTimeout(() => {
        console.log('🔍 App.jsx - fetching notifications after auth delay');
        fetchNotifications();
        // Only subscribe to live updates in production
        if (process.env.NODE_ENV === 'production') {
          subscribeLive();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, fetchNotifications, subscribeLive]);

  // Global Socket.IO connection for real-time drone data
  useEffect(() => {
    console.log('🔌 App.jsx: Setting up global Socket.IO connection');
    
    // Connect to the backend Socket.IO server
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', socket.id);
      setDroneConnection({ isConnected: true, droneId: 'DRONE-001' });
      addNotification({
        type: 'success',
        title: 'Connected',
        message: 'Real-time connection established'
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setDroneConnection({ isConnected: false });
      addNotification({
        type: 'warning',
        title: 'Disconnected',
        message: 'Real-time connection lost'
      });
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error);
      setDroneConnection({ isConnected: false });
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to establish real-time connection'
      });
    });

    // Drone telemetry event handler
    socket.on('drone_telemetry', (telemetryData) => {
      console.log('📡 Received drone telemetry:', telemetryData);
      setTelemetry(telemetryData);
    });

    // Mission update event handler
    socket.on('mission_update', (missionData) => {
      console.log('🎯 Received mission update:', missionData);
      setMissionState(missionData);
      
      // Add notification for important mission events
      if (missionData.status === 'MISSION_COMPLETE') {
        addNotification({
          type: 'success',
          title: 'Mission Complete',
          message: missionData.details || 'Drone mission completed successfully'
        });
      } else if (missionData.status === 'ERROR') {
        addNotification({
          type: 'error',
          title: 'Mission Error',
          message: missionData.details || 'An error occurred during the mission'
        });
      }
    });

    // Drone status event handler
    socket.on('drone_status', (statusData) => {
      console.log('📊 Received drone status:', statusData);
      setDroneConnection({ 
        isConnected: true, 
        droneId: statusData.droneId || 'DRONE-001' 
      });
    });

    // Cleanup function
    return () => {
      console.log('🔌 App.jsx: Cleaning up Socket.IO connection');
      socket.disconnect();
    };
  }, [setTelemetry, setMissionState, setDroneConnection, addNotification]);

  const currentPath = location.pathname;
  const userRole = user?.role;
  
  console.log('🔍 App.jsx: Current path:', currentPath, 'User role:', userRole, 'User:', user);
  
  const getHeaderComponent = () => {
    if (currentPath.startsWith('/admin') || userRole === 'admin') return AdminHeader;
    if (currentPath.startsWith('/seller') || userRole === 'seller') return SellerHeader;
    return UserHeader;
  };
  
  const getFooterComponent = () => {
    if (currentPath.startsWith('/admin') || userRole === 'admin') return AdminFooter;
    if (currentPath.startsWith('/seller') || userRole === 'seller') return SellerFooter;
    return UserFooter;
  };
  
  const HeaderComponent = getHeaderComponent();
  const FooterComponent = getFooterComponent();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderComponent />
      <Toast />
      <Toaster position="top-right" />
      <main className="flex-1">
        <Routes>
          {/* Unauthenticated-only Routes */}
          <Route path="/login" element={<UnauthRoute><EnhancedLogin /></UnauthRoute>} />
          <Route path="/register" element={<UnauthRoute><EnhancedRegister /></UnauthRoute>} />
          <Route path="/enhanced-login" element={<UnauthRoute><EnhancedLogin /></UnauthRoute>} />
          <Route path="/enhanced-register" element={<UnauthRoute><EnhancedRegister /></UnauthRoute>} />
          <Route path="/verify-email" element={<UnauthRoute><VerifyEmail /></UnauthRoute>} />
          <Route path="/forgot-password" element={<UnauthRoute><ForgotPassword /></UnauthRoute>} />
          <Route path="/reset-password/:token" element={<UnauthRoute><ResetPassword /></UnauthRoute>} />

          {/* Smart Home Route - Redirects based on user role */}
          <Route path="/" element={<SmartHomeRoute />} />
          
          {/* Seller Routes */}
          <Route path="/seller" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/products" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/orders" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/shop" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/offers" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/addproducts" element={<ProtectedRoute allowedRoles={['seller']}><SellerAddProduct /></ProtectedRoute>} />
          <Route path="/seller/editproduct/:id" element={<ProtectedRoute allowedRoles={['seller']}><SellerEditProduct /></ProtectedRoute>} />
          <Route path="/seller/edit-shop" element={<ProtectedRoute allowedRoles={['seller']}><SellerEditShop /></ProtectedRoute>} />
          <Route path="/seller/drone-coordination" element={<ProtectedRoute allowedRoles={['seller']}><SellerDroneCoordination /></ProtectedRoute>} />
          <Route path="/seller/drone-tracking" element={<ProtectedRoute allowedRoles={['seller']}><SellerDroneTracking /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/pending-products" element={<ProtectedRoute allowedRoles={['admin']}><AdminPendingProducts /></ProtectedRoute>} />
          <Route path="/admin/pending-shops" element={<ProtectedRoute allowedRoles={['admin']}><AdminPendingShops /></ProtectedRoute>} />
          <Route path="/admin/sellers" element={<ProtectedRoute allowedRoles={['admin']}><AdminSellers /></ProtectedRoute>} />
          <Route path="/admin/pages" element={<ProtectedRoute allowedRoles={['admin']}><AdminPages /></ProtectedRoute>} />
          <Route path="/admin/documentation" element={<ProtectedRoute allowedRoles={['admin']}><AdminDocumentation /></ProtectedRoute>} />
          <Route path="/admin/enhanced-drone-testing" element={<ProtectedRoute allowedRoles={['admin']}><EnhancedDroneTesting /></ProtectedRoute>} />
          <Route path="/admin/drone-fleet-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminDroneFleetManagement /></ProtectedRoute>} />
          <Route path="/admin/regular-delivery" element={<ProtectedRoute allowedRoles={['admin']}><RegularDeliveryDashboard /></ProtectedRoute>} />

          {/* Public browsing routes */}
          <Route path="/shops" element={<Shops />} />
          <Route path="/shop/:shopId" element={<ShopDetails />} />
          <Route path="/offers" element={<UserOffers />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/enhanced-cart" element={<EnhancedCart />} />
          <Route path="/orders" element={<ProtectedRoute allowedRoles={['user']}><Orders /></ProtectedRoute>} />
          <Route path="/orders-dashboard" element={<ProtectedRoute><UnifiedOrderDashboard /></ProtectedRoute>} />
          <Route path="/delivery/:orderId" element={<ProtectedRoute allowedRoles={['user']}><DeliveryTracking /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={['user']}><OrderDetail /></ProtectedRoute>} />
          <Route path="/order-history" element={<ProtectedRoute allowedRoles={['user']}><OrderHistory /></ProtectedRoute>} />
          <Route path="/drone-tracking" element={<ProtectedRoute allowedRoles={['user']}><UserDroneTracking /></ProtectedRoute>} />
          <Route path="/parcel-tracking" element={<ProtectedRoute allowedRoles={['user']}><ParcelTracking /></ProtectedRoute>} />
          <Route path="/qr-validation" element={<ProtectedRoute allowedRoles={['user']}><QRValidation /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Public info pages */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/search" element={<SearchResults />} />

          {/* Public CMS page */}
          <Route path="/pages/:slug" element={<PageViewer />} />
          
          {/* Catch-all route - redirect to appropriate page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FooterComponent />
    </div>
  );
};

// Main App Component (wraps Router)
function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Router>
  );
}

export default App;