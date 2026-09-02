import React from 'react';
import { Wind, Droplets, AlertTriangle, Truck, Cloud, Thermometer, Gauge } from 'lucide-react';

export default function Dashboard({ devices, alerts, carbonLoop }) {
  // Loading state
  if (!devices || devices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading devices from Supabase...</p>
        </div>
      </div>
    );
  }

  // Data Calculations - Use parseFloat to handle string values from backend
  const activeDevices = devices.filter(d => d.status !== 'OFFLINE').length;
  const totalCaptured = parseFloat(devices.reduce((acc, d) => acc + parseFloat(d.estimatedCO2Captured || 0), 0)).toFixed(1);
  const avgPM25 = (devices.reduce((acc, d) => acc + parseFloat(d.pm25 || 0), 0) / devices.length).toFixed(0);
  const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
  const pendingPickups = carbonLoop.filter(r => r.status === 'Pickup Required' || r.status === 'Pickup Requested').length;
  
  const avgCylinderLevel = (devices.reduce((acc, d) => acc + parseFloat(d.cylinderLevel || 0), 0) / devices.length).toFixed(1);
  const avgTemperature = (devices.reduce((acc, d) => acc + parseFloat(d.temperature || 0), 0) / devices.length).toFixed(1);
  
  const highCylinderDevices = devices.filter(d => parseFloat(d.cylinderLevel || 0) > 85);
  const maxCylinderLevel = Math.max(...devices.map(d => parseFloat(d.cylinderLevel || 0))).toFixed(1);

  const cards = [
    { title: 'Total Devices', value: devices.length, sub: `${activeDevices} Active`, icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Est. CO₂ Captured', value: `${totalCaptured} kg`, sub: 'Across all nodes', icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Average PM2.5', value: `${avgPM25} µg/m³`, sub: 'Real-time average', icon: Droplets, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { title: 'High Pollution Alerts', value: highAlerts, sub: 'Requires attention', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Pending Pickups', value: pendingPickups, sub: 'CarbonLoop logistics', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-100">Command Dashboard</h2>
        <span className="text-sm text-slate-400">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{card.value}</h3>
            <p className="text-sm text-slate-400">{card.title}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <Gauge className="w-5 h-5" /> CO₂ Cylinder Status
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              parseFloat(avgCylinderLevel) > 85 ? 'bg-red-500/20 text-red-400' :
              parseFloat(avgCylinderLevel) > 70 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              Avg: {avgCylinderLevel}%
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Average Fill Level</span>
                <span className="font-bold text-slate-200">{avgCylinderLevel}% / 100%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-6 border border-slate-700">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    parseFloat(avgCylinderLevel) > 85 ? 'bg-gradient-to-r from-red-600 to-red-500' :
                    parseFloat(avgCylinderLevel) > 70 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                    'bg-gradient-to-r from-emerald-600 to-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(parseFloat(avgCylinderLevel), 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Maximum capacity: 85% (Auto-alert threshold)</p>
            </div>

            {maxCylinderLevel > 0 && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Highest Fill Level</span>
                  <span className="text-lg font-bold text-red-400">{maxCylinderLevel}%</span>
                </div>
                {highCylinderDevices.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {highCylinderDevices.length} device(s) require immediate pickup
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
              <Thermometer className="w-5 h-5" /> Temperature Monitoring
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
              Avg: {avgTemperature}°C
            </span>
          </div>
          
          <div className="space-y-3">
            {devices.slice(0, 4).map(device => (
              <div key={device.device_id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{device.device_id}</p>
                    <p className="text-xs text-slate-500">{device.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-200">{parseFloat(device.temperature).toFixed(1)}°C</span>
                  <p className="text-xs text-slate-500">Ambient</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-emerald-400">Recent Critical Alerts</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {alerts.slice(-5).reverse().map(alert => (
              <div key={alert.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{alert.deviceId}: {alert.message}</p>
                  <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No active alerts. All systems nominal.</p>}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-purple-400">CarbonLoop Activity</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {carbonLoop.slice(-5).reverse().map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-200">{req.deviceId}</p>
                  <p className="text-xs text-slate-500">{parseFloat(req.capturedAmount).toFixed(1)} kg CO₂</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  req.status === 'Pickup Required' ? 'bg-red-500/20 text-red-400' :
                  req.status === 'Truck Assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
            {carbonLoop.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No active pickups.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}