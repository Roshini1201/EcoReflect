import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function Alerts({ alerts }) {
  const getIcon = (severity) => {
    if (severity === 'HIGH') return <AlertTriangle className="w-5 h-5 text-red-400" />;
    if (severity === 'MEDIUM') return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Alerts</h2>
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No active alerts. All systems nominal.</div>
        ) : (
          <div className="divide-y divide-dark-700">
            {alerts.slice().reverse().map(alert => (
              <div key={alert.id} className="p-4 flex items-start gap-4 hover:bg-dark-700/50 transition-colors">
                {getIcon(alert.severity)}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-slate-200">{alert.deviceId} - {alert.type.replace('_', ' ')}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                      alert.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                  <p className="text-xs text-slate-600 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}