import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Clock, MapPin } from 'lucide-react';

const SavedMissions = ({
  missions,
  selectedMission,
  onMissionLoad,
  onMissionsUpdate
}) => {
  const [localMissions, setLocalMissions] = useState([]);

  useEffect(() => {
    if (missions.length > 0) {
      setLocalMissions(missions);
    } else {
      loadMissions();
    }
  }, [missions]);

  const loadMissions = async () => {
    try {
      const response = await fetch('/api/v1/missions', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const missionsData = data.missions || [];
        setLocalMissions(missionsData);
        onMissionsUpdate(missionsData);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
      setLocalMissions([]);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Saved Missions</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {localMissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localMissions.map(mission => (
            <Card
              key={mission._id || mission.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                selectedMission?._id === mission._id || selectedMission?.id === mission.id
                  ? 'ring-2 ring-blue-500'
                  : ''
              }`}
              onClick={() => onMissionLoad(mission)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium truncate">{mission.name || 'Unnamed Mission'}</h4>
                  <Badge 
                    variant={
                      mission.status === 'active' || mission.status === 'running' 
                        ? 'default' 
                        : 'secondary'
                    }
                  >
                    {mission.status || 'planned'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Type: {mission.type || 'delivery'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Waypoints: {mission.waypoints?.length || 0}</span>
                  </div>
                  
                  {mission.createdAt && (
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(mission.createdAt)}
                    </div>
                  )}
                  
                  {mission.updatedAt && (
                    <div className="text-xs text-gray-500">
                      Updated: {formatDate(mission.updatedAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No saved missions yet</p>
          <p className="text-sm">Create and save missions to see them here</p>
        </div>
      )}
    </div>
  );
};

export default SavedMissions;
