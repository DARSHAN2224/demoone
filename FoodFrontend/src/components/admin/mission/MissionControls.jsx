import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { Plus, Save } from 'lucide-react';

const MissionControls = ({
  selectedDrone,
  setSelectedDrone,
  missionName,
  setMissionName,
  missionType,
  setMissionType,
  autoRTL,
  setAutoRTL,
  missionSpeed,
  setMissionSpeed,
  missionAltitude,
  setMissionAltitude,
  isEditing,
  onNewMission,
  onSaveMission
}) => {
  const [drones, setDrones] = useState([]);

  useEffect(() => {
    loadDrones();
  }, []);

  const loadDrones = async () => {
    try {
      const response = await fetch('/api/v1/drones', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDrones(data.drones || []);
      }
    } catch (error) {
      console.error('Error loading drones:', error);
      // Fallback to mock data for development
      setDrones([
        { _id: 'drone1', name: 'Drone Alpha', status: 'available' },
        { _id: 'drone2', name: 'Drone Beta', status: 'available' }
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="drone-select">Select Drone</Label>
        <select
          id="drone-select"
          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
          value={selectedDrone?._id || ''}
          onChange={(e) => {
            const drone = drones.find(d => d._id === e.target.value);
            setSelectedDrone(drone);
          }}
        >
          <option value="">Choose a drone...</option>
          {drones.map(drone => (
            <option key={drone._id} value={drone._id}>
              {drone.name} ({drone.status})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Button
          onClick={onNewMission}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Mission
        </Button>
        
        <Button
          onClick={onSaveMission}
          className="w-full"
          disabled={!selectedDrone || !missionName.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Mission
        </Button>
      </div>

      {/* Mission Settings */}
      {isEditing && (
        <div className="space-y-3 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium">Mission Settings</h4>
          
          <div>
            <Label htmlFor="mission-name">Mission Name</Label>
            <Input
              id="mission-name"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="Enter mission name"
            />
          </div>

          <div>
            <Label htmlFor="mission-type">Mission Type</Label>
            <select
              id="mission-type"
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              value={missionType}
              onChange={(e) => setMissionType(e.target.value)}
            >
              <option value="delivery">Delivery</option>
              <option value="surveillance">Surveillance</option>
              <option value="mapping">Mapping</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-rtl"
              checked={autoRTL}
              onCheckedChange={setAutoRTL}
            />
            <Label htmlFor="auto-rtl">Auto Return to Launch</Label>
          </div>

          <div>
            <Label htmlFor="mission-speed">Speed (m/s)</Label>
            <Input
              id="mission-speed"
              type="number"
              value={missionSpeed}
              onChange={(e) => setMissionSpeed(Number(e.target.value))}
              min="1"
              max="30"
            />
          </div>

          <div>
            <Label htmlFor="mission-altitude">Altitude (m)</Label>
            <Input
              id="mission-altitude"
              type="number"
              value={missionAltitude}
              onChange={(e) => setMissionAltitude(Number(e.target.value))}
              min="10"
              max="400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControls;
