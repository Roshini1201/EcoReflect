import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Calculate AQI from PM2.5
const calculateAQI = (pm25) => {
  if (pm25 <= 12) return { value: Math.round(pm25 * 50 / 12), category: 'Good', color: '#10b981' };
  if (pm25 <= 35.4) return { value: Math.round(50 + (pm25 - 12) * 50 / 23.4), category: 'Moderate', color: '#f59e0b' };
  if (pm25 <= 55.4) return { value: Math.round(100 + (pm25 - 35.4) * 50 / 20), category: 'Unhealthy for Sensitive', color: '#f97316' };
  if (pm25 <= 150.4) return { value: Math.round(150 + (pm25 - 55.4) * 50 / 95), category: 'Unhealthy', color: '#ef4444' };
  if (pm25 <= 250.4) return { value: Math.round(200 + (pm25 - 150.4) * 50 / 100), category: 'Very Unhealthy', color: '#a855f7' };
  return { value: 300, category: 'Hazardous', color: '#7f1d1d' };
};

// Create custom colored div icons
const createCustomIcon = (status) => {
  const colors = {
    ACTIVE: '#10b981',
    WARNING: '#f59e0b',
    CRITICAL: '#ef4444',
    OFFLINE: '#64748b'
  };
  
  const color = colors[status] || colors.OFFLINE;
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export default function LiveMap({ devices }) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Live Pollution Map</h2>
      <div className="flex-1 rounded-xl overflow-hidden border border-dark-700 relative">
        <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {devices.map(device => {
            const aqi = calculateAQI(device.pm25);
            return (
              <Marker 
                key={device.deviceId} 
                position={[device.lat, device.lng]}
                icon={createCustomIcon(device.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-bold text-slate-900 text-lg">{device.deviceId}</h3>
                    <p className="text-xs text-slate-600 mb-2">{device.location}</p>
                    
                    {/* Status Badge */}
                    <div className={`mb-3 px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      device.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      device.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      device.status === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {device.status}
                    </div>
                    
                    {/* AQI Badge */}
                    <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: aqi.color + '20', border: `1px solid ${aqi.color}` }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-800">AQI</span>
                        <span className="text-2xl font-bold" style={{ color: aqi.color }}>{aqi.value}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{aqi.category}</p>
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-800">
                      <div className="flex justify-between"><span>CO₂:</span> <span>{device.co2.toFixed(0)} ppm</span></div>
                      <div className="flex justify-between"><span>PM2.5:</span> <span>{device.pm25.toFixed(0)} µg/m³</span></div>
                      <div className="flex justify-between"><span>NOx:</span> <span>{device.nox.toFixed(0)} ppb</span></div>
                      <div className="flex justify-between"><span>Temp:</span> <span>{device.temperature.toFixed(1)}°C</span></div>
                      <div className="flex justify-between"><span>Cylinder:</span> <span className={device.cylinderLevel > 85 ? 'text-red-600 font-bold' : ''}>{device.cylinderLevel.toFixed(0)}%</span></div>
                    </div>
                    <Link to={`/device/${device.deviceId}`} className="block mt-3 text-center bg-emerald-600 text-white text-xs py-1.5 rounded hover:bg-emerald-700">
                      View Details
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs space-y-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
            <span className="text-slate-200">Normal (Active)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
            <span className="text-slate-200">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span className="text-slate-200">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow"></div>
            <span className="text-slate-200">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}