import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { 
  Drone, 
  Plus, 
  Settings, 
  Activity, 
  MapPin, 
  Battery, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  Wrench,
  Home,
  Navigation,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import droneManagementService from '../../services/droneManagementService';

const DroneFleetManagement = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('fleet-overview');
  const [fleetStatus, setFleetStatus] = useState({});
  const [registeredDrones, setRegisteredDrones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // New drone registration form
  const [newDrone, setNewDrone] = useState({
    droneId: '',
    name: '',
    model: '',
    serialNumber: '',
    mavsdkPort: '',
    capabilities: '',
    maxPayload: '',
    maxRange: '',
    homeLocation: { lat: 28.6139, lng: 77.2090 }
  });

  // Maintenance form
  const [maintenanceData, setMaintenanceData] = useState({
    droneId: '',
    reason: ''
  });


  // Initialize component with auto-refresh
  useEffect(() => {
    loadFleetStatus();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadFleetStatus(true); // Pass true to indicate auto-refresh
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Sync tab from query string (?tab=register-drone)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);


  const loadFleetStatus = async (isAutoRefresh = false) => {
    try {
      // Only show loading state on initial load, not on auto-refresh
      if (!isAutoRefresh) {
        setLoading(true);
      }
      
      const status = await droneManagementService.getFleetStatus();
      
      if (status.success) {
        setFleetStatus(status);
        setRegisteredDrones(status.fleet);
        // If no drones yet, default to register tab for convenience
        if ((!status.fleet || status.fleet.length === 0) && activeTab !== 'register-drone') {
          setActiveTab('register-drone');
        }
        if (!hasLoadedOnce) setHasLoadedOnce(true);
      } else {
        showMessage(`Failed to load fleet status: ${status.error}`, 'error');
        // Force empty state so Register form appears
        setRegisteredDrones([]);
        if (activeTab !== 'register-drone') {
          setActiveTab('register-drone');
        }
        if (!hasLoadedOnce) setHasLoadedOnce(true);
      }
    } catch (error) {
      showMessage(`Error loading fleet status: ${error.message}`, 'error');
      // Force empty state so Register form appears
      setRegisteredDrones([]);
      if (activeTab !== 'register-drone') {
        setActiveTab('register-drone');
      }
      if (!hasLoadedOnce) setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // ===== DRONE REGISTRATION =====
  const handleDroneRegistration = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!newDrone.droneId || !newDrone.name || !newDrone.model || !newDrone.serialNumber || !newDrone.mavsdkPort) {
        showMessage('Please fill in all required fields (Drone ID, Name, Model, Serial Number, MAVSDK Port)', 'error');
        return;
      }

      // Convert string values to numbers
      const droneData = {
        ...newDrone,
        maxPayload: parseFloat(newDrone.maxPayload),
        maxRange: parseFloat(newDrone.maxRange),
        homeLocation: {
          lat: parseFloat(newDrone.homeLocation.lat),
          lng: parseFloat(newDrone.homeLocation.lng)
        },
        mavsdkPort: parseInt(newDrone.mavsdkPort)
      };

      const result = await droneManagementService.registerNewDrone(droneData);
      
      if (result.success) {
        showMessage(`Drone ${droneData.droneId} registered successfully!`, 'success');
        
        // Reset form
        setNewDrone({
          droneId: '',
          name: '',
          model: '',
          serialNumber: '',
          mavsdkPort: '',
          capabilities: '',
          maxPayload: '',
          maxRange: '',
          homeLocation: { lat: 28.6139, lng: 77.2090 }
        });
        
        // Reload fleet status
        await loadFleetStatus();
      } else {
        showMessage(`Registration failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Registration error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ===== DRONE MANAGEMENT =====
  const handleRemoveDrone = async (droneId) => {
    if (!window.confirm(`Are you sure you want to remove drone ${droneId} from the fleet?`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await droneManagementService.removeDrone(droneId);
      
      if (result.success) {
        showMessage(result.message, 'success');
        await loadFleetStatus();
      } else {
        showMessage(`Removal failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Removal error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaintenance = async () => {
    if (!maintenanceData.droneId || !maintenanceData.reason) {
      showMessage('Please fill in both drone ID and maintenance reason', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await droneManagementService.setDroneMaintenance(
        maintenanceData.droneId, 
        maintenanceData.reason
      );
      
      if (result.success) {
        showMessage(result.message, 'success');
        setMaintenanceData({ droneId: '', reason: '' });
        await loadFleetStatus();
      } else {
        showMessage(`Maintenance mode failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Maintenance error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverDrone = async (droneId) => {
    try {
      setLoading(true);
      const result = await droneManagementService.recoverDrone(droneId);
      
      if (result.success) {
        showMessage(result.message, 'success');
        await loadFleetStatus();
      } else {
        showMessage(`Recovery failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Recovery error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (droneId) => {
    try {
      setLoading(true);
      const result = await droneManagementService.monitorDroneStatus(droneId);
      
      if (result.success) {
        showMessage(`Connection test successful for drone ${droneId}`, 'success');
        await loadFleetStatus(); // Update to show updated status
      } else {
        showMessage(`Connection test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Connection test error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyLand = async () => {
    if (!window.confirm('🚨 Are you sure you want to EMERGENCY LAND all flying drones? This is a critical safety measure.')) {
      return;
    }

    try {
      setLoading(true);
      const results = await droneManagementService.emergencyLandAllDrones();
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      showMessage(`Emergency land commands sent: ${successCount}/${totalCount} successful`, 
        successCount === totalCount ? 'success' : 'warning');
      
      await loadFleetStatus();
    } catch (error) {
      showMessage(`Emergency land error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testAllConnections = async () => {
    try {
      setLoading(true);
      showMessage('Testing connections to all drones...', 'info');
      
      const results = [];
      for (const drone of registeredDrones) {
        try {
          const result = await droneManagementService.monitorDroneStatus(drone.droneId);
          results.push({
            droneId: drone.droneId,
            success: result.success,
            status: result.success ? 'Connected' : 'Failed'
          });
        } catch (error) {
          results.push({
            droneId: drone.droneId,
            success: false,
            status: 'Error'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      showMessage(`Connection test complete: ${successCount}/${totalCount} drones connected`, 
        successCount === totalCount ? 'success' : 'warning');
        
    } catch (error) {
      showMessage(`Connection test error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickStatusCheck = async () => {
    try {
      setLoading(true);
      showMessage('Performing quick status check...', 'info');
      
      // Quick check - just get basic fleet status without full refresh
      const status = await droneManagementService.getFleetStatus();
      
      if (status.success) {
        const activeDrones = status.fleet?.filter(drone => drone.status === 'active').length || 0;
        const totalDrones = status.fleet?.length || 0;
        
        showMessage(`Quick check complete: ${activeDrones}/${totalDrones} drones active`, 
          activeDrones > 0 ? 'success' : 'warning');
      } else {
        showMessage('Quick check failed - no drones available', 'error');
      }
      
    } catch (error) {
      showMessage(`Quick check error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-primary-100 text-primary-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Drone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Drone Fleet Management
                </h1>
                <p className="text-gray-600 mt-1">Monitor, manage, and maintain your drone fleet with precision</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Fleet Health: {fleetStatus.fleetStatus ? fleetStatus.fleetStatus.replace(/_/g, ' ') : 'Loading...'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={loadFleetStatus}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2 border-gray-200 hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </Button>
                <Button 
                  onClick={() => testAllConnections()}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2 border-blue-200 hover:bg-blue-50 text-blue-700"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Test All Connections</span>
                </Button>
                <Button 
                  onClick={() => quickStatusCheck()}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2 border-green-200 hover:bg-green-50 text-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Quick Check</span>
                </Button>
                <Button 
                  onClick={handleEmergencyLand}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Emergency Land</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Drone Registration Form */}
        {(registeredDrones.length === 0 || activeTab === 'register-drone') && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Register New Drone</h2>
                  <p className="text-blue-100">Add a new drone to your fleet with complete specifications</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="droneId" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Drone className="w-4 h-4" />
                        <span>Drone ID *</span>
                      </Label>
                      <Input
                        id="droneId"
                        value={newDrone.droneId}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, droneId: e.target.value }))}
                        placeholder="DRONE-001"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Navigation className="w-4 h-4" />
                        <span>Drone Name *</span>
                      </Label>
                      <Input
                        id="name"
                        value={newDrone.name}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Alpha Wing"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Wrench className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Technical Specifications</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Model *</span>
                      </Label>
                      <Input
                        id="model"
                        value={newDrone.model}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="DJI Matrice 300"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Serial Number *</span>
                      </Label>
                      <Input
                        id="serialNumber"
                        value={newDrone.serialNumber}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="SN-1A2B3C4D5E"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Network & Performance */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Wifi className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Network & Performance</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="mavsdkPort" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Wifi className="w-4 h-4" />
                        <span>MAVSDK Port *</span>
                      </Label>
                      <Input
                        id="mavsdkPort"
                        type="number"
                        value={newDrone.mavsdkPort}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, mavsdkPort: e.target.value }))}
                        placeholder="50041"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPayload" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Max Payload (kg) *</span>
                      </Label>
                      <Input
                        id="maxPayload"
                        type="number"
                        step="0.1"
                        value={newDrone.maxPayload}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, maxPayload: e.target.value }))}
                        placeholder="2.5"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxRange" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Navigation className="w-4 h-4" />
                        <span>Max Range (km) *</span>
                      </Label>
                      <Input
                        id="maxRange"
                        type="number"
                        step="0.1"
                        value={newDrone.maxRange}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, maxRange: e.target.value }))}
                        placeholder="10.0"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Capabilities */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Location & Capabilities</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="capabilities" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Globe className="w-4 h-4" />
                        <span>Capabilities</span>
                      </Label>
                      <Input
                        id="capabilities"
                        value={newDrone.capabilities}
                        onChange={(e) => setNewDrone(prev => ({ ...prev, capabilities: e.target.value }))}
                        placeholder="GPS, Camera, Weather, QR Scanner"
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Home className="w-4 h-4" />
                        <span>Home Location</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="lat" className="text-xs text-gray-500">Latitude *</Label>
                          <Input
                            id="lat"
                            type="number"
                            step="0.0001"
                            value={newDrone.homeLocation.lat}
                            onChange={(e) => setNewDrone(prev => ({ 
                              ...prev, 
                              homeLocation: { ...prev.homeLocation, lat: e.target.value }
                            }))}
                            placeholder="28.6139"
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lng" className="text-xs text-gray-500">Longitude *</Label>
                          <Input
                            id="lng"
                            type="number"
                            step="0.0001"
                            value={newDrone.homeLocation.lng}
                            onChange={(e) => setNewDrone(prev => ({ 
                              ...prev, 
                              homeLocation: { ...prev.homeLocation, lng: e.target.value }
                            }))}
                            placeholder="77.2090"
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button 
                    onClick={handleDroneRegistration}
                    disabled={loading || !newDrone.droneId || !newDrone.name || !newDrone.model || !newDrone.serialNumber || !newDrone.mavsdkPort}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 animate-spin" />
                        <span>Registering Drone...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Plus className="w-5 h-5" />
                        <span>Register New Drone</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {message && (
        <div className={`p-4 rounded-lg ${
          messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          messageType === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-primary-100 text-primary-800 border border-primary-200'
        }`}>
          {message}
        </div>
      )}

        {/* Modern Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
                <TabsTrigger 
                  value="fleet-overview" 
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Activity className="w-4 h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="monitoring"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Globe className="w-4 h-4" />
                  <span>Monitoring</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="register-drone"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="fleet-status"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Drone className="w-4 h-4" />
                  <span>Status</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="maintenance"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Maintenance</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="connection-testing"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Testing</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Fleet Overview Tab */}
            <TabsContent value="fleet-overview" className="p-6">
              <div className="space-y-6">
                {/* Fleet Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Total Drones */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Total Drones</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">
                          {fleetStatus.totalDrones || 0}
                        </p>
                        <p className="text-blue-600 text-xs mt-1">Registered in fleet</p>
                      </div>
                      <div className="p-3 bg-blue-500 rounded-xl">
                        <Drone className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Available Drones */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Available</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">
                          {fleetStatus.availableDrones || 0}
                        </p>
                        <p className="text-green-600 text-xs mt-1">Ready for delivery</p>
                      </div>
                      <div className="p-3 bg-green-500 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* In Use Drones */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-sm font-medium">In Use</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">
                          {fleetStatus.totalDrones ? 
                            (fleetStatus.totalDrones - fleetStatus.availableDrones) : 0}
                        </p>
                        <p className="text-purple-600 text-xs mt-1">Currently active</p>
                      </div>
                      <div className="p-3 bg-purple-500 rounded-xl">
                        <Navigation className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Fleet Health */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-600 text-sm font-medium">Fleet Health</p>
                        <p className="text-3xl font-bold text-emerald-900 mt-2">
                          {fleetStatus.totalDrones ? 
                            Math.round((fleetStatus.availableDrones / fleetStatus.totalDrones) * 100) : 0}%
                        </p>
                        <p className="text-emerald-600 text-xs mt-1">Operational rate</p>
                      </div>
                      <div className="p-3 bg-emerald-500 rounded-xl">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fleet Status Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Activity className="w-5 h-5 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Fleet Status Summary</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Overall Status</p>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          fleetStatus.fleetStatus === 'operational' ? 'bg-green-500' :
                          fleetStatus.fleetStatus === 'degraded' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-semibold text-gray-900">
                          {fleetStatus.fleetStatus ? fleetStatus.fleetStatus.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Last Updated</p>
                      <p className="text-sm text-gray-900">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Production Monitoring Tab */}
            <TabsContent value="monitoring" className="p-6">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-green-900 flex items-center">
                        <Globe className="w-6 h-6 mr-3" />
                        Production Drone Monitoring
                      </h2>
                      <p className="text-green-700 mt-1">Real-time monitoring of all production drones</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-700 font-medium">Live</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Drone Status Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Active Drones */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Drone className="w-5 h-5 mr-2 text-blue-600" />
                      Active Drones ({registeredDrones.filter(d => d.status === 'in_flight' || d.status === 'delivering').length})
                    </h3>
                    <div className="space-y-3">
                      {registeredDrones.filter(d => d.status === 'in_flight' || d.status === 'delivering').length > 0 ? (
                        registeredDrones
                          .filter(d => d.status === 'in_flight' || d.status === 'delivering')
                          .map((drone) => (
                            <div key={drone.droneId} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-blue-900">{drone.droneId}</p>
                                  <p className="text-sm text-blue-700">{drone.name} • {drone.status}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-blue-900">{drone.battery}%</p>
                                  <p className="text-xs text-blue-600">Battery</p>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No active drones currently</p>
                      )}
                    </div>
                  </div>

                  {/* Available Drones */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Available Drones ({registeredDrones.filter(d => d.status === 'available').length})
                    </h3>
                    <div className="space-y-3">
                      {registeredDrones.filter(d => d.status === 'available').length > 0 ? (
                        registeredDrones
                          .filter(d => d.status === 'available')
                          .map((drone) => (
                            <div key={drone.droneId} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-green-900">{drone.droneId}</p>
                                  <p className="text-sm text-green-700">{drone.name} • Ready</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-green-900">{drone.battery}%</p>
                                  <p className="text-xs text-green-600">Battery</p>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No available drones</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fleet Health Overview */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-purple-600" />
                    Fleet Health Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-2xl font-bold text-green-900">{registeredDrones.filter(d => d.status === 'available').length}</p>
                      <p className="text-sm text-green-700">Available</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">{registeredDrones.filter(d => d.status === 'in_flight' || d.status === 'delivering').length}</p>
                      <p className="text-sm text-blue-700">In Flight</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-900">{registeredDrones.filter(d => d.status === 'maintenance').length}</p>
                      <p className="text-sm text-yellow-700">Maintenance</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-2xl font-bold text-red-900">{registeredDrones.filter(d => d.status === 'error' || d.status === 'emergency').length}</p>
                      <p className="text-sm text-red-700">Issues</p>
                    </div>
                  </div>
                </div>

                {/* Auto-refresh Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-800">Auto-refresh enabled</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600">Updates every 30 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

        {/* Register Drone Tab */}
        <TabsContent value="register-drone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🚁 Register New Drone</CardTitle>
              <CardDescription>
                Add a new drone to the fleet. This will test the connection via drone bridge before registration.
                <br />
                <strong>Required:</strong> Drone ID, Name, Model, Serial Number, MAVSDK Port, Max Payload, Max Range, and Home Location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="droneId">Drone ID *</Label>
                  <Input
                    id="droneId"
                    value={newDrone.droneId}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, droneId: e.target.value }))}
                    placeholder="DRONE-001"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Drone Name *</Label>
                  <Input
                    id="name"
                    value={newDrone.name}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Alpha Wing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={newDrone.model}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="DJI Matrice 300"
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number *</Label>
                  <Input
                    id="serialNumber"
                    value={newDrone.serialNumber}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="SN-1A2B3C4D5E"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mavsdkPort">MAVSDK Port *</Label>
                  <Input
                    id="mavsdkPort"
                    type="number"
                    value={newDrone.mavsdkPort}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, mavsdkPort: e.target.value }))}
                    placeholder="50041"
                  />
                </div>
                <div>
                  <Label htmlFor="capabilities">Capabilities</Label>
                  <Input
                    id="capabilities"
                    value={newDrone.capabilities}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, capabilities: e.target.value }))}
                    placeholder="GPS, Camera, Weather, QR Scanner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxPayload">Max Payload (kg) *</Label>
                  <Input
                    id="maxPayload"
                    type="number"
                    step="0.1"
                    value={newDrone.maxPayload}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, maxPayload: e.target.value }))}
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="maxRange">Max Range (km) *</Label>
                  <Input
                    id="maxRange"
                    type="number"
                    step="0.1"
                    value={newDrone.maxRange}
                    onChange={(e) => setNewDrone(prev => ({ ...prev, maxRange: e.target.value }))}
                    placeholder="10.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Home Latitude *</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    value={newDrone.homeLocation.lat}
                    onChange={(e) => setNewDrone(prev => ({ 
                      ...prev, 
                      homeLocation: { ...prev.homeLocation, lat: e.target.value }
                    }))}
                    placeholder="28.6139"
                  />
                </div>
                <div>
                  <Label htmlFor="lng">Home Longitude *</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    value={newDrone.homeLocation.lng}
                    onChange={(e) => setNewDrone(prev => ({ 
                      ...prev, 
                      homeLocation: { ...prev.homeLocation, lng: e.target.value }
                    }))}
                    placeholder="77.2090"
                  />
                </div>
              </div>

              <Button 
                onClick={handleDroneRegistration}
                disabled={loading || !newDrone.droneId || !newDrone.name || !newDrone.model || !newDrone.serialNumber || !newDrone.mavsdkPort}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                {loading ? 'Registering...' : '🚁 Register New Drone'}
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                * Required fields. The system will test the drone connection via drone bridge before registration.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Fleet Status Tab */}
        <TabsContent value="fleet-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📋 Registered Drones</CardTitle>
              <CardDescription>
                Current status of all registered drones in the fleet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registeredDrones.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No drones registered yet. Add your first drone in the Register Drone tab.
                </p>
              ) : (
                <div className="space-y-4">
                  {registeredDrones.map((drone) => (
                    <div key={drone.droneId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{drone.droneId}</h4>
                          <p className="text-sm text-muted-foreground">
                            {drone.model} • {drone.capabilities}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(drone.status)}>
                            {drone.status.toUpperCase()}
                          </Badge>
                          <Badge className={getConnectionColor(drone.connectionStatus)}>
                            {drone.connectionStatus || 'UNKNOWN'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Max Payload:</span>
                          <p className="font-medium">{drone.maxPayload} kg</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Range:</span>
                          <p className="font-medium">{drone.maxRange} km</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Home Location:</span>
                          <p className="font-medium">
                            {drone.homeLocation ? 
                              `${drone.homeLocation.lat.toFixed(4)}, ${drone.homeLocation.lng.toFixed(4)}` : 
                              'Not set'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Seen:</span>
                          <p className="font-medium">
                            {drone.lastSeen ? new Date(drone.lastSeen).toLocaleTimeString() : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleTestConnection(drone.droneId)}
                            variant="outline"
                            size="sm"
                          >
                            🔍 Test Connection
                          </Button>
                          {drone.status === 'maintenance' ? (
                            <Button 
                              onClick={() => handleRecoverDrone(drone.droneId)}
                              variant="outline"
                              size="sm"
                              className="text-green-700 border-green-300"
                            >
                              🔧 Recover
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => setMaintenanceData({ droneId: drone.droneId, reason: '' })}
                              variant="outline"
                              size="sm"
                              className="text-yellow-700 border-yellow-300"
                            >
                              🔧 Set Maintenance
                            </Button>
                          )}
                        </div>
                        
                        <Button 
                          onClick={() => handleRemoveDrone(drone.droneId)}
                          variant="outline"
                          size="sm"
                          className="text-red-700 border-red-300"
                          disabled={drone.status !== 'available'}
                        >
                          🗑️ Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔧 Drone Maintenance</CardTitle>
              <CardDescription>
                Set drones to maintenance mode or recover them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maintenanceDroneId">Drone ID</Label>
                  <Input
                    id="maintenanceDroneId"
                    value={maintenanceData.droneId}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, droneId: e.target.value }))}
                    placeholder="DRONE-001"
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceReason">Maintenance Reason</Label>
                  <Input
                    id="maintenanceReason"
                    value={maintenanceData.reason}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Battery replacement, hardware check, etc."
                  />
                </div>
              </div>

              <Button 
                onClick={handleSetMaintenance}
                disabled={loading || !maintenanceData.droneId || !maintenanceData.reason}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {loading ? 'Setting Maintenance...' : '🔧 Set to Maintenance Mode'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connection Testing Tab */}
        <TabsContent value="connection-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Connection Testing</CardTitle>
              <CardDescription>
                Test connections to all drones and monitor fleet health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={loadFleetStatus}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Fleet</span>
                </Button>
                <Button 
                  onClick={() => droneManagementService.startConnectionMonitoring()}
                  variant="outline"
                  className="text-green-700 border-green-300"
                >
                  🟢 Start Monitoring
                </Button>
                <Button 
                  onClick={() => droneManagementService.stopConnectionMonitoring()}
                  variant="outline"
                  className="text-red-700 border-red-300"
                >
                  🔴 Stop Monitoring
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📊 Connection Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {registeredDrones.map((drone) => {
                        const connectionStatus = droneManagementService.getDroneConnectionStatus(drone.droneId);
                        return (
                          <div key={drone.droneId} className="flex items-center justify-between">
                            <span className="text-sm">{drone.droneId}</span>
                            <Badge className={getConnectionColor(connectionStatus?.status)}>
                              {connectionStatus?.status || 'UNKNOWN'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">💚 Fleet Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const health = droneManagementService.getFleetHealth();
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Drones:</span>
                            <span className="font-semibold">{health.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Available:</span>
                            <span className="font-semibold text-green-600">{health.available}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>In Use:</span>
                            <span className="font-semibold text-primary-600">{health.inUse}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Maintenance:</span>
                            <span className="font-semibold text-yellow-600">{health.maintenance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Disconnected:</span>
                            <span className="font-semibold text-red-600">{health.disconnected}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between">
                              <span>Health Score:</span>
                              <span className={`font-semibold ${
                                health.healthPercentage >= 80 ? 'text-green-600' :
                                health.healthPercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {health.healthPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Important Notes */}
      <Card className="border-primary-200 bg-primary-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="text-primary-600 text-xl">ℹ️</div>
            <div className="space-y-2">
              <h4 className="font-semibold text-primary-800">Drone Fleet Management Notes</h4>
              <ul className="text-sm text-primary-700 space-y-1">
                <li>• <strong>Manual Registration:</strong> All drones must be manually registered before automation can work</li>
                <li>• <strong>Connection Testing:</strong> System tests drone bridge connectivity before registration</li>
                <li>• <strong>Production Ready:</strong> This system works for both testing and production environments</li>
                <li>• <strong>Safety First:</strong> Emergency land function available for critical situations</li>
                <li>• <strong>Real-time Monitoring:</strong> Continuous connection monitoring and health checks</li>
                <li>• <strong>Maintenance Mode:</strong> Drones can be set to maintenance to prevent automation assignment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
};

export default DroneFleetManagement;
