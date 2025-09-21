import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Globe, MapPin } from 'lucide-react';
import { api } from '../../stores/api.js';

const OrderTrackMap = ({ droneId, location }) => {
  const [coords, setCoords] = useState({ lat: location?.lat || 0, lng: location?.lng || 0 });
  const [status, setStatus] = useState('');

  useEffect(() => {
    let timer;
    let socket;
    const poll = async () => {
      try {
        if (!droneId) return;
        const res = await api.get(`/drone/status/${droneId}`);
        const d = res?.data?.data?.drone || {};
        if (d.location?.lat && d.location?.lng) {
          setCoords({ lat: d.location.lat, lng: d.location.lng });
        }
        if (d.status) setStatus(d.status);
      } catch {} {}
    };
    poll();
    timer = setInterval(poll, 5000);
    // Socket live updates - skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 Development mode: OrderTrackMap Socket.IO connection skipped');
    } else {
      try {
        socket = io('http://localhost:8000/browser', { 
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });
      
        socket.on('connect', () => {
          console.log('🔌 OrderTrackMap: Socket.IO connected');
          if (droneId) {
            socket.emit('join_drone', { droneId });
          }
        });
        
        socket.on('connect_error', (error) => {
          console.warn('🔌 OrderTrackMap: Socket.IO connection error:', error.message);
        });
        
        socket.on('drone:update', (payload) => {
          if (payload?.drone?.location?.lat && payload?.drone?.location?.lng) {
            setCoords({ lat: payload.drone.location.lat, lng: payload.drone.location.lng });
          }
          if (payload?.drone?.status) setStatus(payload.drone.status);
        });
      } catch (error) {
        console.warn('🔌 OrderTrackMap: Socket.IO setup error:', error.message);
      }
    }
    return () => {
      clearInterval(timer);
      try { socket?.disconnect(); } catch {}
    };
  }, [droneId]);
  
  const { lat, lng } = coords;
  
  return (
    <div className="w-full h-64 overflow-hidden rounded border">
      {/* Google Maps Placeholder */}
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="text-center">
          <Globe className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-gray-700 text-sm font-medium">Google Maps</p>
          <p className="text-xs text-gray-500 mb-2">Drone tracking map</p>
          
          {/* Location Info */}
          <div className="bg-white rounded p-2 text-xs">
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 text-blue-500" />
              <span className="font-medium">Drone {droneId || ''}</span>
            </div>
            <p className="text-gray-600">
              Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
            </p>
            {status && (
              <p className="text-gray-500">Status: {status}</p>
            )}
          </div>
          
          <p className="text-xs text-gray-400 mt-2">
            Add Google Maps API key for full map
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackMap;


