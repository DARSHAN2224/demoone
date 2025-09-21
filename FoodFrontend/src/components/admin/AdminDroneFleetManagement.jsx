import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, PlusCircle, Trash2, RefreshCw, Drone, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminDroneFleetManagement = () => {
  const [drones, setDrones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the new drone form
  const [newDroneId, setNewDroneId] = useState('');
  const [newWsUrl, setNewWsUrl] = useState('');
  const [newModel, setNewModel] = useState('Generic Drone');
  const [formError, setFormError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Function to fetch the list of drones from the backend
  const fetchDrones = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/admin/drones');
      setDrones(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch drone fleet. Please ensure the backend is running.');
      console.error('Error fetching drones:', err);
        } finally {
      setIsLoading(false);
    }
  };

  // Fetch drones when the component mounts
  useEffect(() => {
    fetchDrones();
  }, []);

  const handleAddDrone = async (e) => {
    e.preventDefault();
    if (!newDroneId || !newWsUrl) {
        setFormError('Both Drone ID and WebSocket URL are required.');
        return;
    }
    
    setFormError('');
    setIsAdding(true);
    
    try {
        const response = await api.post('/api/v1/admin/drones', { 
          droneId: newDroneId, 
          wsUrl: newWsUrl,
          model: newModel
        });
        
        toast.success('Drone added successfully!');
        setNewDroneId('');
        setNewWsUrl('');
        setNewModel('Generic Drone');
        fetchDrones(); // Refresh the list after adding
    } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to add drone.';
        setFormError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setIsAdding(false);
    }
  };

  const handleRemoveDrone = async (droneId) => {
    if (!window.confirm(`Are you sure you want to remove ${droneId}?`)) {
      return;
    }
    
    try {
      await api.delete(`/api/v1/admin/drones/${droneId}`);
      toast.success('Drone removed successfully!');
      fetchDrones(); // Refresh the list after removal
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to remove drone.';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'CONNECTED': { variant: 'default', color: 'text-green-400', icon: Wifi },
      'CONNECTING': { variant: 'secondary', color: 'text-yellow-400', icon: RefreshCw },
      'DISCONNECTED': { variant: 'destructive', color: 'text-red-400', icon: WifiOff },
      'ERROR': { variant: 'destructive', color: 'text-red-400', icon: AlertTriangle },
      'offline': { variant: 'destructive', color: 'text-red-400', icon: WifiOff },
      'active': { variant: 'default', color: 'text-green-400', icon: Wifi }
    };
    
    const config = statusConfig[status] || statusConfig['offline'];
    const IconComponent = config.icon;

        return (
      <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        <span>{status}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-cyan-400" />
            <p className="text-gray-400">Loading drone fleet...</p>
                    </div>
                </div>
                    </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Fleet</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchDrones} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
                    <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drone Fleet Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your drone fleet and monitor real-time connections</p>
                </div>
                <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Drone className="w-3 h-3" />
            <span>{drones.length} drones</span>
          </Badge>
          <Button onClick={fetchDrones} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
                </div>
            </div>

      {/* Form to Add a New Drone */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <span>Add New Drone</span>
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Register a new drone in your fleet by providing its unique identifier and WebSocket URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDrone} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="droneId" className="text-gray-700 dark:text-gray-300">Drone ID</Label>
                <Input
                  id="droneId"
                  placeholder="DRONE-002"
                  value={newDroneId}
                  onChange={(e) => setNewDroneId(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  required
                />
                </div>
              <div className="space-y-2">
                <Label htmlFor="wsUrl" className="text-gray-700 dark:text-gray-300">WebSocket URL</Label>
                <Input
                  id="wsUrl"
                  placeholder="ws://localhost:8002"
                  value={newWsUrl}
                  onChange={(e) => setNewWsUrl(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  required
                />
            </div>
              <div className="space-y-2">
                <Label htmlFor="model" className="text-gray-700 dark:text-gray-300">Model</Label>
                <Input
                  id="model"
                  placeholder="Generic Drone"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                />
            </div>
        </div>
            {formError && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4"/>
                {formError}
              </p>
            )}
            <Button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4"/>
                  Add Drone
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* List of Existing Drones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fleet Overview</h2>
          <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
            {drones.length} {drones.length === 1 ? 'drone' : 'drones'} registered
          </Badge>
            </div>

        {drones.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Drone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Drones Registered</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Add your first drone to start managing your fleet
                            </p>
                        </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drones.map(drone => (
              <Card key={drone.droneId} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center space-x-2">
                      <Drone className="w-5 h-5 text-cyan-400" />
                      <span>{drone.droneId}</span>
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDrone(drone.droneId)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      {getStatusBadge(drone.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Model:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{drone.model}</span>
            </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">WebSocket:</span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">{drone.wsUrl}</span>
            </div>
                    {drone.lastSeen && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Last Seen:</span>
                        <span className="text-gray-900 dark:text-white text-xs">
                          {new Date(drone.lastSeen).toLocaleString()}
                        </span>
                        </div>
                    )}
                </div>
                </CardContent>
              </Card>
                            ))}
                        </div>
                    )}
                </div>
        </div>
    );
};

export default AdminDroneFleetManagement;
