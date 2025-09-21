import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Plane, Home, Land } from 'lucide-react';
import GoogleMap from '../../maps/GoogleMap';
import droneTrackingService from '../../../services/droneTrackingService';

const MissionMap = ({
  selectedDrone,
  waypoints,
  isEditing,
  onWaypointsUpdate
}) => {
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [dronePosition, setDronePosition] = useState(null);
  const [droneStatus, setDroneStatus] = useState('idle');

  useEffect(() => {
    // Listen for drone position updates
    droneTrackingService.on('dronePositionUpdate', handleDronePositionUpdate);
    
    return () => {
      droneTrackingService.off('dronePositionUpdate', handleDronePositionUpdate);
    };
  }, []);

  const handleDronePositionUpdate = (data) => {
    if (data.droneId === selectedDrone?._id) {
      setDronePosition({ lat: data.lat, lng: data.lng });
      setDroneStatus(data.status || 'active');
    }
  };

  const handleMapClick = ({ lat, lng }) => {
    if (isEditing) {
      const newWaypoint = {
        lat,
        lng,
        alt: 50 // Default altitude
      };
      onWaypointsUpdate([...waypoints, newWaypoint]);
    }
  };

  const handleWaypointRemove = (index) => {
    if (isEditing) {
      const updatedWaypoints = waypoints.filter((_, i) => i !== index);
      onWaypointsUpdate(updatedWaypoints);
    }
  };

  const addHomeWaypoint = () => {
    if (isEditing && dronePosition) {
      const homeWaypoint = {
        lat: dronePosition.lat,
        lng: dronePosition.lng,
        alt: 0
      };
      onWaypointsUpdate([...waypoints, homeWaypoint]);
    }
  };

  const addCurrentPositionWaypoint = () => {
    if (isEditing && dronePosition) {
      const currentWaypoint = {
        lat: dronePosition.lat,
        lng: dronePosition.lng,
        alt: 50
      };
      onWaypointsUpdate([...waypoints, currentWaypoint]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Mission Map</h3>
        {isEditing && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addHomeWaypoint}
              disabled={!dronePosition}
            >
              <Home className="w-4 h-4 mr-1" />
              Add Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addCurrentPositionWaypoint}
              disabled={!dronePosition}
            >
              <Plane className="w-4 h-4 mr-1" />
              Add Current
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <GoogleMap
          center={mapCenter}
          zoom={15}
          waypoints={waypoints}
          dronePosition={dronePosition}
          droneStatus={droneStatus}
          onMapClick={handleMapClick}
          onWaypointRemove={handleWaypointRemove}
          className="h-96 w-full border rounded-lg"
        />
        
        {isEditing && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <p className="text-sm text-gray-600">
              Click on the map to add waypoints
            </p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        <p>Waypoints: {waypoints.length}</p>
        {dronePosition && (
          <p>Drone Position: {dronePosition.lat.toFixed(6)}, {dronePosition.lng.toFixed(6)}</p>
        )}
      </div>
    </div>
  );
};

export default MissionMap;