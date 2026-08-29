import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { MapPin, Battery, Wind, Droplets } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet default icon issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerColor = (status) => {
  switch(status) {
    case 'ACTIVE': return '#10b981'; // eco-500
    case 'WARNING': return '#f59e0b'; // yellow-500
    case 'CRITICAL': return '#ef4444'; // red-500
    default: return '#64748b'; // slate-500
  }
};

export default function LiveMap({ devices }) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Live Pollution Map</h2>
      <div className="flex-1 rounded-xl overflow-hidden border border-dark-700 relative">
        <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {devices.map(device => (
            <Marker key={device.deviceId} position={[device.lat, device.lng]}>
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-slate-900">{device.deviceId}</h3>
                  <p className="text-xs text-slate-600 mb-2">{device.location}</p>
                  <div className="space-y-1 text-sm text-slate-800">
                    <div className="flex justify-between"><span>Status:</span> <span className="font-semibold" style={{color: getMarkerColor(device.status)}}>{device.status}</span></div>
                    <div className="flex justify-between"><span>CO₂:</span> <span>{device.co2.toFixed(0)} ppm</span></div>
                    <div className="flex justify-between"><span>PM2.5:</span> <span>{device.pm25.toFixed(0)} µg/m³</span></div>
                    <div className="flex justify-between"><span>Cylinder:</span> <span>{device.cylinderLevel.toFixed(0)}%</span></div>
                  </div>
                  <Link to={`/device/${device.deviceId}`} className="block mt-3 text-center bg-eco-600 text-white text-xs py-1.5 rounded hover:bg-eco-700">
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-dark-800/90 backdrop-blur p-3 rounded-lg border border-dark-700 text-xs space-y-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-eco-500"></div> Normal</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> High Pollution / Warning</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Critical / Action Required</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-500"></div> Offline</div>
        </div>
      </div>
    </div>
  );
}