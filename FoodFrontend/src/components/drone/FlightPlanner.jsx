import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Route, MapPin, Target, Plus, Trash2, Save } from 'lucide-react';

const FlightPlanner = ({ drone, onFlightPlanUpdate }) => {
  const [flightPlan, setFlightPlan] = useState({
    name: '',
    description: '',
    waypoints: [],
    altitude: 100,
    speed: 15
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (drone?.currentFlightPlan) {
      setFlightPlan(drone.currentFlightPlan);
    }
  }, [drone]);

  const addWaypoint = () => {
    const newWaypoint = {
      id: Date.now(),
      lat: drone?.currentLocation?.lat || 0,
      lng: drone?.currentLocation?.lng || 0,
      altitude: flightPlan.altitude,
      description: `Waypoint ${flightPlan.waypoints.length + 1}`
    };

    setFlightPlan(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, newWaypoint]
    }));
  };

  const updateWaypoint = (id, updates) => {
    setFlightPlan(prev => ({
      ...prev,
      waypoints: prev.waypoints.map(wp => 
        wp.id === id ? { ...wp, ...updates } : wp
      )
    }));
  };

  const removeWaypoint = (id) => {
    setFlightPlan(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter(wp => wp.id !== id)
    }));
  };

  const saveFlightPlan = () => {
    if (!flightPlan.name.trim()) {
      alert('Flight plan name is required');
      return;
    }
    
    if (flightPlan.waypoints.length < 2) {
      alert('At least 2 waypoints are required');
      return;
    }

    const planToSave = {
      ...flightPlan,
      id: Date.now(),
      createdAt: new Date(),
      droneId: drone?._id,
      status: 'planned'
    };

    if (onFlightPlanUpdate) {
      onFlightPlanUpdate(planToSave);
    }
    
    alert('Flight plan saved successfully!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Flight Planner</span>
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'View' : 'Edit'}
            </Button>
            <Button
              size="sm"
              onClick={saveFlightPlan}
              disabled={!isEditing}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Plan
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  value={flightPlan.name}
                  onChange={(e) => setFlightPlan(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter flight plan name"
                />
              </div>
              <div>
                <Label htmlFor="planDescription">Description</Label>
                <Input
                  id="planDescription"
                  value={flightPlan.description}
                  onChange={(e) => setFlightPlan(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="altitude">Altitude (m)</Label>
                <Input
                  id="altitude"
                  type="number"
                  value={flightPlan.altitude}
                  onChange={(e) => setFlightPlan(prev => ({ ...prev, altitude: parseInt(e.target.value) }))}
                  min="30"
                  max="120"
                />
              </div>
              <div>
                <Label htmlFor="speed">Speed (m/s)</Label>
                <Input
                  id="speed"
                  type="number"
                  value={flightPlan.speed}
                  onChange={(e) => setFlightPlan(prev => ({ ...prev, speed: parseInt(e.target.value) }))}
                  min="5"
                  max="25"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Waypoints ({flightPlan.waypoints.length})</Label>
                <Button size="sm" onClick={addWaypoint}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Waypoint
                </Button>
              </div>

              <div className="space-y-3">
                {flightPlan.waypoints.map((waypoint, index) => (
                  <div key={waypoint.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Waypoint {index + 1}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeWaypoint(waypoint.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Latitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={waypoint.lat}
                          onChange={(e) => updateWaypoint(waypoint.id, { lat: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Longitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={waypoint.lng}
                          onChange={(e) => updateWaypoint(waypoint.id, { lng: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Altitude (m)</Label>
                        <Input
                          type="number"
                          value={waypoint.altitude}
                          onChange={(e) => updateWaypoint(waypoint.id, { altitude: parseInt(e.target.value) })}
                          min="30"
                          max="120"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Plan Details</h4>
                <p className="text-sm text-blue-700">{flightPlan.name || 'Unnamed Plan'}</p>
                <p className="text-xs text-primary-600">{flightPlan.description || 'No description'}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900">Flight Parameters</h4>
                <p className="text-sm text-green-700">Altitude: {flightPlan.altitude}m</p>
                <p className="text-sm text-green-700">Speed: {flightPlan.speed} m/s</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900">Waypoints</h4>
                <p className="text-sm text-purple-700">{flightPlan.waypoints.length} waypoints</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Waypoints</h4>
              <div className="space-y-2">
                {flightPlan.waypoints.map((waypoint, index) => (
                  <div key={waypoint.id} className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
                    <Target className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">Waypoint {index + 1}</p>
                      <p className="text-sm text-gray-600">
                        {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)} at {waypoint.altitude}m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FlightPlanner;
