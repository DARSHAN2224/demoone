import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MapPin, MoveUp, MoveDown, Trash2, Download, Upload } from 'lucide-react';

const WaypointsList = ({
  waypoints,
  isEditing,
  onWaypointsUpdate,
  missionSpeed,
  missionAltitude
}) => {
  const moveWaypoint = (index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === waypoints.length - 1)) {
      return;
    }

    const updatedWaypoints = [...waypoints];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [updatedWaypoints[index], updatedWaypoints[newIndex]] = [updatedWaypoints[newIndex], updatedWaypoints[index]];
    
    // Update order
    updatedWaypoints.forEach((wp, i) => {
      wp.order = i;
    });
    
    onWaypointsUpdate(updatedWaypoints);
  };

  const deleteWaypoint = (index) => {
    const updatedWaypoints = waypoints.filter((_, i) => i !== index);
    // Reorder remaining waypoints
    updatedWaypoints.forEach((wp, i) => {
      wp.order = i;
    });
    onWaypointsUpdate(updatedWaypoints);
  };

  const exportMission = () => {
    if (waypoints.length === 0) {
      alert('No waypoints to export');
      return;
    }

    const missionData = {
      name: 'Exported Mission',
      type: 'delivery',
      waypoints: waypoints,
      speed: missionSpeed,
      altitude: missionAltitude,
      createdAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(missionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mission_${Date.now()}.json`;
    link.click();
  };

  const importMission = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const missionData = JSON.parse(e.target.result);
        onWaypointsUpdate(missionData.waypoints || []);
        alert('Mission imported successfully!');
      } catch (error) {
        console.error('Error importing mission:', error);
        alert('Error importing mission file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Waypoints</h3>
        <div className="flex gap-2">
          <Button
            onClick={exportMission}
            size="sm"
            variant="outline"
            disabled={waypoints.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            onClick={() => document.getElementById('import-file').click()}
            size="sm"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importMission}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-2">
        {waypoints.map((waypoint, index) => (
          <div
            key={waypoint.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Badge variant={waypoint.action === 'waypoint' ? 'default' : 'secondary'}>
                {waypoint.action.charAt(0).toUpperCase() + waypoint.action.slice(1)} {index + 1}
              </Badge>
              <div className="text-sm text-gray-600">
                {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
              </div>
              <div className="text-sm text-gray-500">
                Alt: {waypoint.altitude}m | Speed: {waypoint.speed}m/s
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => moveWaypoint(index, 'up')}
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => moveWaypoint(index, 'down')}
                  size="sm"
                  variant="outline"
                  disabled={index === waypoints.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => deleteWaypoint(index)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {waypoints.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No waypoints added yet</p>
            <p className="text-sm">Click on the map or use the buttons above to add waypoints</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaypointsList;
