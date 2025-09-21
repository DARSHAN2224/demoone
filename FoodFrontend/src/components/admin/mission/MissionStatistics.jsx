import React from 'react';
import droneTrackingService from '../../../services/droneTrackingService';

const MissionStatistics = ({ waypoints }) => {
  const calculateMissionStats = () => {
    if (waypoints.length < 2) return {};

    let totalDistance = 0;
    let estimatedTime = 0;
    let averageSpeed = 0;

    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      
      const distance = droneTrackingService.calculateDistance(
        prev.lat, prev.lng, curr.lat, curr.lng
      );
      totalDistance += distance;
      
      // Estimate time based on speed and distance
      const speed = curr.speed || 15; // Default speed if not specified
      const time = distance / speed;
      estimatedTime += time;
      averageSpeed += speed;
    }

    if (waypoints.length > 1) {
      averageSpeed = averageSpeed / (waypoints.length - 1);
    }

    return {
      totalWaypoints: waypoints.length,
      totalDistance: totalDistance.toFixed(2),
      estimatedTime: (estimatedTime / 60).toFixed(1), // Convert to minutes
      averageSpeed: averageSpeed.toFixed(1)
    };
  };

  const missionStats = calculateMissionStats();

  if (Object.keys(missionStats).length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div className="text-center p-3 bg-primary-50 rounded-lg">
        <div className="text-2xl font-bold text-primary-600">{missionStats.totalWaypoints}</div>
        <div className="text-sm text-gray-600">Waypoints</div>
      </div>
      
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{missionStats.totalDistance}km</div>
        <div className="text-sm text-gray-600">Distance</div>
      </div>
      
      <div className="text-center p-3 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">{missionStats.estimatedTime}min</div>
        <div className="text-sm text-gray-600">Est. Time</div>
      </div>
      
      <div className="text-center p-3 bg-purple-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">{missionStats.averageSpeed}m/s</div>
        <div className="text-sm text-gray-600">Avg Speed</div>
      </div>
    </div>
  );
};

export default MissionStatistics;
