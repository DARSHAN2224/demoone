import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import droneTrackingService from '../../services/droneTrackingService';
import { Video, Camera, Settings, Play, Pause, Square, Maximize2, Download, Record, Eye, EyeOff } from 'lucide-react';

const VideoStreamingDashboard = () => {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [videoStreams, setVideoStreams] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [recordingStates, setRecordingStates] = useState(new Map());
  const [fullscreenStream, setFullscreenStream] = useState(null);
  const videoRefs = useRef(new Map());

  useEffect(() => {
    initializeVideoStreaming();
    return () => {
      droneTrackingService.disconnect();
    };
  }, []);

  const initializeVideoStreaming = async () => {
    try {
      await droneTrackingService.connect();
      
      // Listen for connection status
      droneTrackingService.on('tracking:connected', () => {
        setIsConnected(true);
        console.log('🚁 Connected to video streaming service');
      });

      droneTrackingService.on('tracking:disconnected', () => {
        setIsConnected(false);
        console.log('🔌 Disconnected from video streaming service');
      });

      // Listen for video updates
      droneTrackingService.on('drone:video_updated', handleVideoUpdate);

      // Load initial drones
      loadDrones();
      
    } catch (error) {
      console.error('Failed to initialize video streaming:', error);
    }
  };

  const loadDrones = async () => {
    try {
      const response = await fetch('/api/v1/drones', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const dronesData = await response.json();
        setDrones(dronesData.data || []);
      }
    } catch (error) {
      console.error('Failed to load drones:', error);
    }
  };

  const handleVideoUpdate = ({ droneId, video }) => {
    setVideoStreams(prev => new Map(prev.set(droneId, video)));
    
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, video, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });
  };

  const startVideoStream = async (droneId) => {
    try {
      // Simulate starting video stream
      const mockVideo = {
        streamUrl: `rtsp://drone-${droneId}.local:8554/stream`,
        quality: '720p',
        isActive: true,
        timestamp: new Date()
      };
      
      setVideoStreams(prev => new Map(prev.set(droneId, mockVideo)));
      console.log(`Started video stream for drone ${droneId}`);
    } catch (error) {
      console.error('Failed to start video stream:', error);
    }
  };

  const stopVideoStream = async (droneId) => {
    try {
      const currentVideo = videoStreams.get(droneId);
      if (currentVideo) {
        const stoppedVideo = { ...currentVideo, isActive: false };
        setVideoStreams(prev => new Map(prev.set(droneId, stoppedVideo)));
        console.log(`Stopped video stream for drone ${droneId}`);
      }
    } catch (error) {
      console.error('Failed to stop video stream:', error);
    }
  };

  const toggleRecording = (droneId) => {
    setRecordingStates(prev => {
      const newStates = new Map(prev);
      const isRecording = newStates.get(droneId) || false;
      newStates.set(droneId, !isRecording);
      return newStates;
    });
  };

  const toggleFullscreen = (droneId) => {
    const videoElement = videoRefs.current.get(droneId);
    if (videoElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setFullscreenStream(null);
      } else {
        videoElement.requestFullscreen();
        setFullscreenStream(droneId);
      }
    }
  };

  const downloadVideo = (droneId) => {
    // Simulate video download
    const link = document.createElement('a');
    link.href = '#';
    link.download = `drone-${droneId}-recording.mp4`;
    link.click();
    console.log(`Downloading video from drone ${droneId}`);
  };

  const getAuthToken = () => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  const getStreamQualityColor = (quality) => {
    switch (quality) {
      case '4K': return 'text-purple-600';
      case '1080p': return 'text-primary-600';
      case '720p': return 'text-green-600';
      case '480p': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Streaming Dashboard</h1>
          <p className="text-gray-600">Live video feeds from drone fleet</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Badge>
          <div className="text-sm text-gray-600">
            {drones.length} drones • {Array.from(videoStreams.values()).filter(v => v.isActive).length} active streams
          </div>
        </div>
      </div>

      <Tabs value={selectedDrone || 'all'} onValueChange={setSelectedDrone} className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="all">All Drones</TabsTrigger>
          {drones.map(drone => (
            <TabsTrigger key={drone._id} value={drone._id}>
              Drone {drone.name || drone._id}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Drones View */}
        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {drones.map(drone => (
              <VideoStreamCard
                key={drone._id}
                drone={drone}
                videoStream={videoStreams.get(drone._id)}
                isRecording={recordingStates.get(drone._id) || false}
                onStartStream={() => startVideoStream(drone._id)}
                onStopStream={() => stopVideoStream(drone._id)}
                onToggleRecording={() => toggleRecording(drone._id)}
                onToggleFullscreen={() => toggleFullscreen(drone._id)}
                onDownload={() => downloadVideo(drone._id)}
                videoRef={(el) => videoRefs.current.set(drone._id, el)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Individual Drone Views */}
        {drones.map(drone => (
          <TabsContent key={drone._id} value={drone._id} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <VideoStreamCard
                drone={drone}
                videoStream={videoStreams.get(drone._id)}
                isRecording={recordingStates.get(drone._id) || false}
                onStartStream={() => startVideoStream(drone._id)}
                onStopStream={() => stopVideoStream(drone._id)}
                onToggleRecording={() => toggleRecording(drone._id)}
                onToggleFullscreen={() => toggleFullscreen(drone._id)}
                onDownload={() => downloadVideo(drone._id)}
                videoRef={(el) => videoRefs.current.set(drone._id, el)}
                fullWidth
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* No Drones Message */}
      {drones.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Drones Available</h3>
            <p className="text-gray-600">No drones have been registered or are currently online.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const VideoStreamCard = ({
  drone,
  videoStream,
  isRecording,
  onStartStream,
  onStopStream,
  onToggleRecording,
  onToggleFullscreen,
  onDownload,
  videoRef,
  fullWidth = false
}) => {
  const [showControls, setShowControls] = useState(true);

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <Card className={`${fullWidth ? 'w-full' : ''} hover:shadow-lg transition-shadow`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="w-5 h-5" />
            <span>Drone {drone.name || drone._id}</span>
            {videoStream?.isActive && (
              <Badge variant="default" className="bg-green-500">
                Live
              </Badge>
            )}
            {isRecording && (
              <Badge variant="destructive">
                <Record className="w-3 h-3 mr-1" />
                Recording
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleControls}
            >
              {showControls ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Badge variant="outline" className={getStreamQualityColor(videoStream?.quality)}>
              {videoStream?.quality || 'Unknown'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Display */}
        <div className="relative">
          {videoStream?.isActive ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoStream.streamUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                controls={showControls}
              />
              
              {/* Overlay Controls */}
              {!showControls && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary" onClick={onToggleFullscreen}>
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={onToggleRecording}>
                      <Record className={`w-4 h-4 ${isRecording ? 'text-red-500' : ''}`} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Video className="w-16 h-16 mx-auto mb-2" />
                <p>No video feed</p>
                <p className="text-sm">Camera may be offline</p>
              </div>
            </div>
          )}
        </div>

        {/* Stream Controls */}
        {showControls && (
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {videoStream?.isActive ? (
                <Button size="sm" variant="outline" onClick={onStopStream}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
              ) : (
                <Button size="sm" onClick={onStartStream}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Stream
                </Button>
              )}
              
              <Button
                size="sm"
                variant={isRecording ? 'destructive' : 'outline'}
                onClick={onToggleRecording}
                disabled={!videoStream?.isActive}
              >
                <Record className="w-4 h-4 mr-2" />
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onToggleFullscreen}
                disabled={!videoStream?.isActive}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                disabled={!isRecording}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Stream Information */}
        {videoStream && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Stream URL</p>
                <p className="font-mono text-xs truncate">{videoStream.streamUrl}</p>
              </div>
              <div>
                <p className="text-gray-600">Quality</p>
                <p className="font-medium">{videoStream.quality}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium">{videoStream.isActive ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Update</p>
                <p className="font-medium">
                  {videoStream.timestamp ? new Date(videoStream.timestamp).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoStreamingDashboard;
