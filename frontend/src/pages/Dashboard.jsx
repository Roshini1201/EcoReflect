import React from 'react';
import { Wind, Droplets, Battery, AlertTriangle, Truck, Cloud, Thermometer, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ devices, alerts, carbonLoop }) {
  const activeDevices = devices.filter(d => d.status !== 'OFFLINE').length;
  const totalCaptured = devices.reduce((acc, d) => acc + d.estimatedCO2Captured, 0).toFixed(1);
  const avgPM25 = devices.length > 0 ? (devices.reduce((acc, d) => acc + d.pm25, 0) / devices.length).toFixed(0) : 0;
  const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
  const pendingPickups = carbonLoop.filter(r => r.status === 'Pickup Required' || r.status === 'Pickup Requested').length;
  
  // Calculate average cylinder level and temperature
  const avgCylinderLevel = devices.length > 0 ? (devices.reduce((acc, d) => acc + d.cylinderLevel, 0) / devices.length).toFixed(1) : 0;
  const avgTemperature = devices.length > 0 ? (devices.reduce((acc, d) => acc + d.temperature, 0) / devices.length).toFixed(1) : 0;
  
  // Find devices with high cylinder levels
  const highCylinderDevices = devices.filter(d => d.cylinderLevel > 85);
  const maxCylinderLevel = devices.length > 0 ? Math.max(...devices.map(d => d.cylinderLevel)).toFixed(1) : 0;

  const cards = [
    { title: 'Total Devices', value: devices.length, sub: `${activeDevices} Active`, icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Est. CO₂ Captured', value: `${totalCaptured} kg`, sub: 'Across all nodes', icon: Wind, color: 'text-eco-400', bg: 'bg-eco-500/10' },
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
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-eco-500/50 transition-colors">
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

      {/* Cylinder & Temperature Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CO₂ Cylinder Status */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-eco-400 flex items-center gap-2">
              <Gauge className="w-5 h-5" /> CO₂ Cylinder Status
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              avgCylinderLevel > 85 ? 'bg-red-500/20 text-red-400' :
              avgCylinderLevel > 70 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-eco-500/20 text-eco-400'
            }`}>
              Avg: {avgCylinderLevel}%
            </span>
          </div>
          
          <div className="space-y-4">
            {/* Average Cylinder Gauge */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Average Fill Level</span>
                <span className="font-bold text-slate-200">{avgCylinderLevel}% / 100%</span>
              </div>
              <div className="w-full bg-dark-900 rounded-full h-6 border border-dark-700">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    avgCylinderLevel > 85 ? 'bg-gradient-to-r from-red-600 to-red-500' :
                    avgCylinderLevel > 70 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                    'bg-gradient-to-r from-eco-600 to-eco-500'
                  }`} 
                  style={{ width: `${Math.min(avgCylinderLevel, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Maximum capacity: 85% (Auto-alert threshold)</p>
            </div>

            {/* Max Cylinder Device */}
            {maxCylinderLevel > 0 && (
              <div className="p-4 bg-dark-900 rounded-lg border border-dark-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Highest Fill Level</span>
                  <span className="text-lg font-bold text-red-400">{maxCylinderLevel}%</span>
                </div>
                {highCylinderDevices.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {highCylinderDevices.length} device(s) require pickup
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Temperature Monitoring */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
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
              <div key={device.deviceId} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{device.deviceId}</p>
                    <p className="text-xs text-slate-500">{device.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-200">{device.temperature.toFixed(1)}°C</span>
                  <p className="text-xs text-slate-500">Ambient</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts & CarbonLoop Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-eco-400">Recent Critical Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(-5).reverse().map(alert => (
              <div key={alert.id} className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg border border-dark-700">
                <AlertTriangle className={`w-5 h-5 ${alert.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{alert.deviceId}: {alert.message}</p>
                  <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-slate-500 text-sm">No active alerts.</p>}
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-purple-400">CarbonLoop Activity</h3>
          <div className="space-y-3">
            {carbonLoop.slice(-5).reverse().map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-dark-700">
                <div>
                  <p className="text-sm font-medium text-slate-200">{req.deviceId}</p>
                  <p className="text-xs text-slate-500">{req.capturedAmount.toFixed(1)} kg CO₂</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  req.status === 'Pickup Required' ? 'bg-red-500/20 text-red-400' :
                  req.status === 'Truck Assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-eco-500/20 text-eco-400'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
            {carbonLoop.length === 0 && <p className="text-slate-500 text-sm">No active pickups.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}