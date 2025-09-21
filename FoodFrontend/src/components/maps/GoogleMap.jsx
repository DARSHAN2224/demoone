import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, Navigation, Battery, Signal } from 'lucide-react';

const render = (status) => {
  if (status === Status.LOADING) return <div className="flex items-center justify-center h-64">Loading map...</div>;
  if (status === Status.FAILURE) return <div className="flex items-center justify-center h-64 text-red-500">Error loading map</div>;
  return null;
};

const GoogleMapComponent = ({ 
  center, 
  zoom = 15, 
  waypoints = [], 
  dronePosition, 
  droneHeading = 0,
  droneStatus = 'idle',
  onMapClick,
  onWaypointAdd,
  onWaypointRemove,
  className = "h-96 w-full",
  homeLocation = { lat: 47.6414678, lng: -122.1401649 } // Default Seattle home
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [droneMarker, setDroneMarker] = useState(null);
  const homeMarkerRef = useRef(null);
  const [path, setPath] = useState(null);
  const [trail, setTrail] = useState([]);
  const trailPathRef = useRef(null);
  const prevWpCountRef = useRef(0);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add click listener
      if (onMapClick) {
        newMap.addListener('click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onMapClick({ lat, lng });
        });
      }

      setMap(newMap);
    }
  }, [mapRef, map, center, zoom, onMapClick]);

  // Recenter map when center prop changes
  useEffect(() => {
    if (map && center) {
      try { map.setCenter(center); } catch(_) {}
    }
  }, [map, center]);

  // Update waypoint markers
  useEffect(() => {
    if (!map) return;

    // Clear existing waypoint markers
    markers.forEach(marker => { try { marker.setMap(null); } catch(_) {} });

    const newMarkers = waypoints.map((waypoint, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: waypoint.lat, lng: waypoint.lng },
        map: map,
        title: `Waypoint ${index + 1}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        },
        label: {
          text: `${index + 1}`,
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      // Add click listener for removal
      if (onWaypointRemove) {
        marker.addListener('click', () => {
          onWaypointRemove(index);
        });
      }

      return marker;
    });

    setMarkers(newMarkers);
  }, [map, waypoints, onWaypointRemove]);

  // Update drone marker - OPTIMIZED for real-time updates
  useEffect(() => {
    if (!map) return;

    // Create marker only once
    if (!droneMarker) {
      const newDroneMarker = new window.google.maps.Marker({
        position: { lat: 47.6414678, lng: -122.1401649 }, // Initial position
        map: map,
        title: 'Drone',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: getDroneColor('idle'),
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          rotation: 0,
          anchor: new window.google.maps.Point(0, 0)
        },
        zIndex: 1000
      });
      setDroneMarker(newDroneMarker);
    }
  }, [map]);

  // Direct marker updates for real-time sync (bypasses React re-renders)
  useEffect(() => {
    if (droneMarker && dronePosition) {
      try {
        // Direct position update - no React re-render
        droneMarker.setPosition({ lat: dronePosition.lat, lng: dronePosition.lng });
        
        // Direct icon update for status changes
        droneMarker.setIcon({
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: getDroneColor(droneStatus),
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          rotation: droneHeading,
          anchor: new window.google.maps.Point(0, 0)
        });
        
        // Update title
        droneMarker.setTitle(`Drone - ${droneStatus} at ${dronePosition.lat.toFixed(6)}, ${dronePosition.lng.toFixed(6)} (Heading: ${droneHeading.toFixed(1)}°)`);
        
        console.log(`🎯 Drone marker updated: Position (${dronePosition.lat.toFixed(4)}, ${dronePosition.lng.toFixed(4)}), Heading: ${droneHeading.toFixed(1)}°`);
      } catch (error) {
        console.warn('Failed to update drone marker:', error);
      }
    }
  }, [droneMarker, dronePosition, droneStatus, droneHeading]);

  // Update home marker
  useEffect(() => {
    if (!map || !homeLocation) return;

    // Remove existing home marker
    if (homeMarkerRef.current) { try { homeMarkerRef.current.setMap(null); } catch(_) {} }

    const newHomeMarker = new window.google.maps.Marker({
      position: { lat: homeLocation.lat, lng: homeLocation.lng },
      map: map,
      title: `Home Base - ${homeLocation.lat.toFixed(6)}, ${homeLocation.lng.toFixed(6)}`,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#EF4444',
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 3
      },
      zIndex: 500
    });

    homeMarkerRef.current = newHomeMarker;
  }, [map, homeLocation]);

  // Update flight path
  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Remove existing path
    if (path) {
      path.setMap(null);
    }

    const flightPath = new window.google.maps.Polyline({
      path: waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })),
      geodesic: true,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 3
    });

    flightPath.setMap(map);
    setPath(flightPath);
  }, [map, waypoints]);

  // Reset trail when a new mission starts (heuristic: waypoints count transitions from 0 to >0)
  useEffect(() => {
    const prev = prevWpCountRef.current;
    if (prev === 0 && waypoints.length > 0) {
      // Clear previous trail polyline
      if (trailPathRef.current) {
        try { trailPathRef.current.setMap(null); } catch(_) {}
      }
      setTrail([]);
      trailPathRef.current = null;
    }
    prevWpCountRef.current = waypoints.length;
  }, [waypoints.length]);

  // Draw/update live drone trail
  useEffect(() => {
    if (!map || !dronePosition) return;

    // Only add to trail if drone is actually moving (not stationary at waypoints)
    if (droneStatus === 'in_mission' || droneStatus === 'taking_off' || droneStatus === 'returning_home') {
      setTrail(prev => {
        // Check if position is significantly different from last point
        if (prev.length > 0) {
          const lastPoint = prev[prev.length - 1];
          const distance = Math.sqrt(
            Math.pow(dronePosition.lat - lastPoint.lat, 2) + 
            Math.pow(dronePosition.lng - lastPoint.lng, 2)
          );
          
          // Only add if moved more than 0.0001 degrees (about 10 meters)
          if (distance < 0.0001) return prev;
        }
        
        const next = [...prev, { lat: dronePosition.lat, lng: dronePosition.lng }];
        if (next.length > 500) next.shift();
        return next;
      });
    }
  }, [map, dronePosition, droneStatus]);

  // Update trail polyline when trail changes
  useEffect(() => {
    if (!map || trail.length === 0) return;

    // Update or create polyline
    try {
      if (trailPathRef.current) {
        trailPathRef.current.setPath(trail);
      } else {
        const poly = new window.google.maps.Polyline({
          path: trail,
          geodesic: true,
          strokeColor: '#10B981',
          strokeOpacity: 0.9,
          strokeWeight: 3
        });
        poly.setMap(map);
        trailPathRef.current = poly;
      }
    } catch (_) {}
  }, [map, trail]);

  // Smooth map following - OPTIMIZED for real-time updates
  useEffect(() => {
    if (map && dronePosition) {
      // Use smooth panTo instead of setCenter for better performance
      map.panTo({ lat: dronePosition.lat, lng: dronePosition.lng });
    }
  }, [map, dronePosition]);

  const getDroneColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'mission': return '#3B82F6';
      case 'in_mission': return '#8B5CF6';
      case 'landing': return '#F59E0B';
      case 'landing_at_waypoint': return '#F59E0B';
      case 'landed_at_waypoint': return '#F97316';
      case 'scanning_qr': return '#3B82F6';
      case 'qr_success': return '#10B981';
      case 'qr_failed': return '#EF4444';
      case 'taking_off': return '#3B82F6';
      case 'taking_off_from_waypoint': return '#3B82F6';
      case 'returning_home': return '#6366F1';
      case 'weather_hold': return '#EF4444';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Map overlay with drone info */}
      {dronePosition && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-gray-200">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <div className={`w-4 h-4 rounded-full ${getDroneColor(droneStatus)} animate-pulse`} />
            <span className="text-gray-800">Drone Status: {droneStatus.toUpperCase()}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-mono text-xs text-gray-500">GPS Position</div>
                <div className="font-mono">{dronePosition.lat.toFixed(6)}, {dronePosition.lng.toFixed(6)}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-mono text-xs text-gray-500">Heading</div>
                <div className="font-mono">{droneHeading}°</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waypoint counter */}
      {waypoints.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-sm font-medium">Waypoints: {waypoints.length}</div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-200">
        <div className="text-xs font-semibold text-gray-700 mb-2">Map Legend</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Home Base</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Waypoints</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Drone Trail</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-blue-500"></div>
            <span>Drone (Arrow)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleMap = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[GoogleMap] Missing VITE_GOOGLE_MAPS_API_KEY. Please set it in FoodFrontend/.env and restart the dev server.');
  }

  return (
    <Wrapper apiKey={apiKey || ''} libraries={['marker']} render={render}>
      <GoogleMapComponent {...props} />
    </Wrapper>
  );
};

export default GoogleMap;
