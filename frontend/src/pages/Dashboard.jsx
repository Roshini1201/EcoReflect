import React from 'react';
import { Wind, Droplets, Battery, AlertTriangle, Truck, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ devices, alerts, carbonLoop }) {
  const activeDevices = devices.filter(d => d.status !== 'OFFLINE').length;
  const totalCaptured = devices.reduce((acc, d) => acc + d.estimatedCO2Captured, 0).toFixed(1);
  const avgPM25 = (devices.reduce((acc, d) => acc + d.pm25, 0) / devices.length).toFixed(0);
  const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
  const pendingPickups = carbonLoop.filter(r => r.status === 'Pickup Required' || r.status === 'Pickup Requested').length;

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
          </div>
        </div>
      </div>
    </div>
  );
}