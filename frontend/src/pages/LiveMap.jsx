import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Marker } from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Wind, AlertTriangle } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon for CarbonLoop pickups
const truckIcon = L.divIcon({
  html: `<div style="background-color: #a855f7; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="1" y="3" width="15" height="13"></rect>
             <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
             <circle cx="5.5" cy="18.5" r="2.5"></circle>
             <circle cx="18.5" cy="18.5" r="2.5"></circle>
           </svg>
         </div>`,
  className: 'truck-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const calculateAQI = (pm25) => {
  const val = parseFloat(pm25) || 0;
  if (val <= 12) return { value: Math.round(val * 50 / 12), category: 'Good', color: '#10b981', zoneColor: 'rgba(16, 185, 129, 0.15)' };
  if (val <= 35.4) return { value: Math.round(50 + (val - 12) * 50 / 23.4), category: 'Moderate', color: '#f59e0b', zoneColor: 'rgba(245, 158, 11, 0.15)' };
  if (val <= 55.4) return { value: Math.round(100 + (val - 35.4) * 50 / 20), category: 'Unhealthy for Sensitive', color: '#f97316', zoneColor: 'rgba(249, 115, 22, 0.2)' };
  if (val <= 150.4) return { value: Math.round(150 + (val - 55.4) * 50 / 95), category: 'Unhealthy', color: '#ef4444', zoneColor: 'rgba(239, 68, 68, 0.25)' };
  return { value: 300, category: 'Very Unhealthy', color: '#a855f7', zoneColor: 'rgba(168, 85, 247, 0.3)' };
};

const getMarkerColor = (status, cylinderLevel) => {
  const cyl = parseFloat(cylinderLevel) || 0;
  if (status === 'CRITICAL' || cyl > 90) return '#ef4444';
  if (status === 'WARNING' || cyl > 85) return '#f59e0b';
  if (status === 'ACTIVE') return '#10b981';
  return '#64748b';
};

export default function LiveMap({ devices, carbonLoop = [] }) {
  const navigate = useNavigate();

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

  const validDevices = devices.filter(device => {
    const lat = parseFloat(device.latitude || device.lat);
    const lng = parseFloat(device.longitude || device.lng || device.lon);
    return !isNaN(lat) && !isNaN(lng);
  });

  // Get devices with active pickup requests
  const devicesWithPickups = carbonLoop
    .filter(req => !['Completed', 'Cancelled'].includes(req.status))
    .map(req => req.deviceId);

  if (validDevices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Live Pollution Map</h2>
          <p className="text-red-400">No devices with valid coordinates</p>
        </div>
      </div>
    );
  }

  const centerLat = parseFloat(validDevices[0].latitude || validDevices[0].lat);
  const centerLng = parseFloat(validDevices[0].longitude || validDevices[0].lng || validDevices[0].lon);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Live Pollution Map</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">
            📍 {validDevices.length} Devices Active
          </span>
          <span className="px-2 py-1 bg-purple-900/50 rounded text-purple-300">
             {devicesWithPickups.length} Pickups Pending
          </span>
        </div>
      </div>
      
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 relative" style={{ minHeight: '600px' }}>
        <MapContainer center={[centerLat, centerLng]} zoom={12} style={{ height: '100%', width: '100%' }}>
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
            const hasPickup = devicesWithPickups.includes(device.device_id);
            
            return (
              <React.Fragment key={device.device_id}>
                {/* Pollution Heatmap Zone */}
                <Circle
                  center={[lat, lng]}
                  radius={800}
                  pathOptions={{
                    fillColor: aqi.zoneColor,
                    color: aqi.color,
                    weight: 1,
                    opacity: 0.6,
                    fillOpacity: 0.3
                  }}
                />
                
                {/* Monitoring Radius */}
                <Circle
                  center={[lat, lng]}
                  radius={500}
                  pathOptions={{
                    fillColor: 'rgba(148, 163, 184, 0.1)',
                    color: '#94a3b8',
                    weight: 1,
                    opacity: 0.4,
                    fillOpacity: 0.1,
                    dashArray: '5, 5'
                  }}
                />
                
                {/* Device Marker */}
                <CircleMarker 
                  center={[lat, lng]}
                  radius={hasPickup ? 18 : 15}
                  fillColor={color}
                  color="#fff"
                  weight={3}
                  opacity={1}
                  fillOpacity={0.9}
                >
                  <Popup maxWidth={300}>
                    <div className="min-w-[280px]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{device.device_id}</h3>
                          <p className="text-sm text-slate-600">{device.device_name}</p>
                        </div>
                        {hasPickup && (
                          <Truck className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                      
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
                          <span className="text-sm font-semibold">Air Quality Index</span>
                          <span className="text-2xl font-bold" style={{ color: aqi.color }}>{aqi.value}</span>
                        </div>
                        <p className="text-xs text-slate-600">{aqi.category}</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>CO₂:</span>
                          <span className="font-mono font-semibold">{(parseFloat(device.co2) || 0).toFixed(0)} ppm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PM2.5:</span>
                          <span className="font-mono font-semibold">{(parseFloat(device.pm25) || 0).toFixed(0)} µg/m³</span>
                        </div>
                        <div className="flex justify-between">
                          <span>NOx:</span>
                          <span className="font-mono font-semibold">{(parseFloat(device.nox) || 0).toFixed(0)} ppb</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <span className="font-mono">{(parseFloat(device.temperature) || 0).toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-300">
                          <span className="font-semibold">Cylinder:</span>
                          <span className={`font-mono font-bold ${(cyl) > 85 ? 'text-red-600' : ''}`}>
                            {cyl.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      {hasPickup && (
                        <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
                          <p className="text-xs text-purple-800 font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Pickup Requested
                          </p>
                        </div>
                      )}
                      
                      <Link to={`/device/${device.device_id}`} className="block mt-3 text-center bg-emerald-600 text-white text-xs py-2 rounded hover:bg-emerald-700">
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
        
        {/* Enhanced Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur p-4 rounded-lg border border-slate-700 text-xs space-y-3 shadow-lg z-[1000] max-w-[250px]">
          <div>
            <h4 className="text-slate-200 font-semibold mb-2 border-b border-slate-600 pb-1">Device Status</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></div><span className="text-slate-200">Normal (Active)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow"></div><span className="text-slate-200">Warning</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div><span className="text-slate-200">Critical</span></div>
            </div>
          </div>
          
          <div>
            <h4 className="text-slate-200 font-semibold mb-2 border-b border-slate-600 pb-1">Pollution Zones</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500"></div><span className="text-slate-200">Good Air</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500"></div><span className="text-slate-200">Moderate</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500/30 border border-red-500"></div><span className="text-slate-200">Unhealthy</span></div>
            </div>
          </div>
          
          <div>
            <h4 className="text-slate-200 font-semibold mb-2 border-b border-slate-600 pb-1">Other</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-slate-400 border-dashed"></div><span className="text-slate-200">Monitoring Range (500m)</span></div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"><Truck className="w-3 h-3 text-white" /></div><span className="text-slate-200">Pickup Required</span></div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats Overlay */}
        <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs shadow-lg z-[1000]">
          <h4 className="text-slate-200 font-semibold mb-2">Live Stats</h4>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Avg AQI:</span>
              <span className="text-slate-200 font-mono">
                {Math.round(devices.reduce((acc, d) => acc + calculateAQI(d.pm25).value, 0) / devices.length)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Max PM2.5:</span>
              <span className="text-slate-200 font-mono">
                {Math.max(...devices.map(d => parseFloat(d.pm25) || 0)).toFixed(0)} µg/m³
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Pickups:</span>
              <span className="text-purple-400 font-mono">{devicesWithPickups.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}