import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';

const calculateAQI = (pm25) => {
  const val = parseFloat(pm25) || 0;
  if (val <= 12) return { value: Math.round(val * 50 / 12), category: 'Good', color: '#10b981' };
  if (val <= 35.4) return { value: Math.round(50 + (val - 12) * 50 / 23.4), category: 'Moderate', color: '#f59e0b' };
  if (val <= 55.4) return { value: Math.round(100 + (val - 35.4) * 50 / 20), category: 'Unhealthy for Sensitive', color: '#f97316' };
  if (val <= 150.4) return { value: Math.round(150 + (val - 55.4) * 50 / 95), category: 'Unhealthy', color: '#ef4444' };
  return { value: 300, category: 'Very Unhealthy', color: '#a855f7' };
};

const getMarkerColor = (status, cylinderLevel) => {
  const cyl = parseFloat(cylinderLevel) || 0;
  if (status === 'CRITICAL' || cyl > 90) return '#ef4444';
  if (status === 'WARNING' || cyl > 85) return '#f59e0b';
  if (status === 'ACTIVE') return '#10b981';
  return '#64748b';
};

export default function LiveMap({ devices }) {
  if (!devices || devices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading devices...</p>
        </div>
      </div>
    );
  }

  // Safely parse coordinates to prevent map crashes
  const validDevices = devices.filter(device => {
    const lat = parseFloat(device.latitude || device.lat);
    const lng = parseFloat(device.longitude || device.lng || device.lon);
    return !isNaN(lat) && !isNaN(lng);
  });

  if (validDevices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Live Pollution Map</h2>
          <p className="text-red-400">No devices with valid coordinates</p>
          <p className="text-slate-500 text-sm mt-2">Check Supabase 'devices' table for latitude/longitude columns.</p>
        </div>
      </div>
    );
  }

  const centerLat = parseFloat(validDevices[0].latitude || validDevices[0].lat);
  const centerLng = parseFloat(validDevices[0].longitude || validDevices[0].lng || validDevices[0].lon);

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Live Pollution Map</h2>
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 relative" style={{ minHeight: '600px' }}>
        <MapContainer center={[centerLat, centerLng]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validDevices.map(device => {
            const lat = parseFloat(device.latitude || device.lat);
            const lng = parseFloat(device.longitude || device.lng || device.lon);
            const color = getMarkerColor(device.status, device.cylinderLevel);
            const aqi = calculateAQI(device.pm25);
            const cyl = parseFloat(device.cylinderLevel) || 0;
            
            return (
              <CircleMarker 
                key={device.device_id} 
                center={[lat, lng]}
                radius={15}
                fillColor={color}
                color="#fff"
                weight={3}
                opacity={1}
                fillOpacity={0.9}
              >
                <Popup>
                  <div className="min-w-[250px]">
                    <h3 className="font-bold text-lg mb-1">{device.device_id}</h3>
                    <p className="text-sm text-slate-600 mb-2">{device.device_name}</p>
                    <p className="text-xs text-slate-500 mb-3">{device.location}</p>
                    
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                      device.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      device.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {device.status}
                    </div>
                    
                    <div className="bg-slate-100 p-2 rounded mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">AQI</span>
                        <span className="text-2xl font-bold" style={{ color: aqi.color }}>{aqi.value}</span>
                      </div>
                      <p className="text-xs text-slate-600">{aqi.category}</p>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>CO₂:</span><span className="font-mono">{(parseFloat(device.co2) || 0).toFixed(0)} ppm</span></div>
                      <div className="flex justify-between"><span>PM2.5:</span><span className="font-mono">{(parseFloat(device.pm25) || 0).toFixed(0)} µg/m³</span></div>
                      <div className="flex justify-between"><span>NOx:</span><span className="font-mono">{(parseFloat(device.nox) || 0).toFixed(0)} ppb</span></div>
                      <div className="flex justify-between"><span>Temperature:</span><span className="font-mono">{(parseFloat(device.temperature) || 0).toFixed(1)}°C</span></div>
                      <div className="flex justify-between"><span>Cylinder:</span><span className={`font-mono font-bold ${cyl > 85 ? 'text-red-600' : ''}`}>{cyl.toFixed(0)}%</span></div>
                    </div>
                    
                    <Link to={`/device/${device.device_id}`} className="block mt-3 text-center bg-emerald-600 text-white text-xs py-2 rounded hover:bg-emerald-700">
                      View Details
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        
        <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs space-y-2 shadow-lg z-[1000]">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></div><span className="text-slate-200">Normal (Active)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow"></div><span className="text-slate-200">Warning</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div><span className="text-slate-200">Critical</span></div>
        </div>
      </div>
    </div>
  );
}