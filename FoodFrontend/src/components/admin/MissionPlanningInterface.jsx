import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Navigation } from 'lucide-react';
import droneTrackingService from '../../services/droneTrackingService';

// Import modular components
import MissionControls from './mission/MissionControls';
import MissionMap from './mission/MissionMap';
import WaypointsList from './mission/WaypointsList';
import SavedMissions from './mission/SavedMissions';
import MissionStatistics from './mission/MissionStatistics';

const MissionPlanningInterface = () => {
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [missionName, setMissionName] = useState('');
  const [missionType, setMissionType] = useState('delivery');
  const [autoRTL, setAutoRTL] = useState(true);
  const [missionSpeed, setMissionSpeed] = useState(15);
  const [missionAltitude, setMissionAltitude] = useState(100);

  const handleMissionUpdate = (updatedWaypoints) => {
    setWaypoints(updatedWaypoints);
  };

  const handleMissionLoad = (mission) => {
    setSelectedMission(mission);
    setWaypoints(mission.waypoints || []);
    setMissionName(mission.name);
    setMissionType(mission.type || 'delivery');
    setAutoRTL(mission.autoRTL !== false);
    setMissionSpeed(mission.speed || 15);
    setMissionAltitude(mission.altitude || 100);
    setIsEditing(false);
  };

  const handleNewMission = () => {
    setSelectedMission(null);
    setWaypoints([]);
    setMissionName('');
    setMissionType('delivery');
    setAutoRTL(true);
    setMissionSpeed(15);
    setMissionAltitude(100);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Mission Planning Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="planning" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="planning">Mission Planning</TabsTrigger>
              <TabsTrigger value="waypoints">Waypoints</TabsTrigger>
              <TabsTrigger value="missions">Saved Missions</TabsTrigger>
            </TabsList>

            <TabsContent value="planning" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MissionControls
                  selectedDrone={selectedDrone}
                  setSelectedDrone={setSelectedDrone}
                  missionName={missionName}
                  setMissionName={setMissionName}
                  missionType={missionType}
                  setMissionType={setMissionType}
                  autoRTL={autoRTL}
                  setAutoRTL={setAutoRTL}
                  missionSpeed={missionSpeed}
                  setMissionSpeed={setMissionSpeed}
                  missionAltitude={missionAltitude}
                  setMissionAltitude={setMissionAltitude}
                  isEditing={isEditing}
                  onNewMission={handleNewMission}
                  onSaveMission={async () => {
                    if (!selectedDrone || !missionName.trim()) {
                      alert('Please select a drone and enter a mission name');
                      return;
                    }

                    try {
                      const missionData = {
                        name: missionName,
                        type: missionType,
                        droneId: selectedDrone._id,
                        waypoints: waypoints,
                        autoRTL: autoRTL,
                        speed: missionSpeed,
                        altitude: missionAltitude,
                        status: 'planned'
                      };

                      if (selectedMission) {
                        // Update existing mission
                        await droneTrackingService.updateMission(selectedDrone._id, selectedMission._id, missionData);
                      } else {
                        // Create new mission
                        await droneTrackingService.createMission(selectedDrone._id, waypoints, missionType);
                      }

                      alert('Mission saved successfully!');
                      setIsEditing(false);
                    } catch (error) {
                      console.error('Error saving mission:', error);
                      alert('Error saving mission');
                    }
                  }}
                />

                <div className="lg:col-span-2">
                  <MissionMap
                    selectedDrone={selectedDrone}
                    waypoints={waypoints}
                    isEditing={isEditing}
                    onWaypointsUpdate={handleMissionUpdate}
                  />
                  
                  <MissionStatistics waypoints={waypoints} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="waypoints" className="space-y-4">
              <WaypointsList
                waypoints={waypoints}
                isEditing={isEditing}
                onWaypointsUpdate={handleMissionUpdate}
                missionSpeed={missionSpeed}
                missionAltitude={missionAltitude}
              />
            </TabsContent>

            <TabsContent value="missions" className="space-y-4">
              <SavedMissions
                missions={missions}
                selectedMission={selectedMission}
                onMissionLoad={handleMissionLoad}
                onMissionsUpdate={setMissions}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionPlanningInterface;
