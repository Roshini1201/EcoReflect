import React from 'react';
import { Truck, Warehouse, Factory, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const steps = [
  { name: 'CO₂ Captured', icon: AlertCircle, color: 'text-blue-400' },
  { name: 'Cylinder Storage', icon: Warehouse, color: 'text-indigo-400' },
  { name: 'Threshold Reached', icon: AlertCircle, color: 'text-yellow-400' },
  { name: 'Pickup Request', icon: AlertCircle, color: 'text-orange-400' },
  { name: 'Truck Assigned', icon: Truck, color: 'text-purple-400' },
  { name: 'In Collection', icon: Truck, color: 'text-pink-400' },
  { name: 'Local Warehouse', icon: Warehouse, color: 'text-cyan-400' },
  { name: 'Renewable Plant', icon: Factory, color: 'text-eco-400' },
];

export default function CarbonLoop({ requests, socket }) {
  const updateStatus = (requestId, newStatus) => {
    socket.emit('updatePickupStatus', { requestId, newStatus });
  };

  const getNextStatus = (current) => {
    const statuses = ['Pickup Required', 'Pickup Requested', 'Truck Assigned', 'In Collection', 'Collected', 'Delivered to Warehouse', 'Sent to Renewable Plant'];
    const idx = statuses.indexOf(current);
    return idx < statuses.length - 1 ? statuses[idx + 1] : current;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">CarbonLoop Logistics</h2>
        <p className="text-slate-400">Closed-loop carbon management ecosystem: From roadside capture to renewable fuel conversion.</p>
      </div>

      {/* Visual Workflow */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[800px]">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center w-24">
                <div className={`p-3 rounded-full bg-dark-900 border border-dark-700 mb-2 ${step.color}`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-300">{step.name}</span>
              </div>
              {idx < steps.length - 1 && <ArrowRight className="w-5 h-5 text-slate-600 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Pickup Requests Table */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-lg font-semibold">Active Pickup Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-dark-900">
              <tr>
                <th className="px-6 py-3">Request ID</th>
                <th className="px-6 py-3">Device</th>
                <th className="px-6 py-3">Captured CO₂</th>
                <th className="px-6 py-3">Current Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-dark-700/30">
                  <td className="px-6 py-4 font-mono text-slate-400">{req.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 font-medium text-slate-200">{req.deviceId}</td>
                  <td className="px-6 py-4 text-eco-400">{req.capturedAmount.toFixed(1)} kg</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      req.status === 'Pickup Required' ? 'bg-red-500/20 text-red-400' :
                      req.status === 'Truck Assigned' || req.status === 'In Collection' ? 'bg-yellow-500/20 text-yellow-400' :
                      req.status === 'Sent to Renewable Plant' ? 'bg-eco-500/20 text-eco-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {req.status !== 'Sent to Renewable Plant' && (
                      <button 
                        onClick={() => updateStatus(req.id, getNextStatus(req.status))}
                        className="text-xs bg-eco-600 hover:bg-eco-700 text-white px-3 py-1.5 rounded transition-colors"
                      >
                        Advance Status
                      </button>
                    )}
                    {req.status === 'Sent to Renewable Plant' && (
                      <span className="text-xs text-eco-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Completed</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No active pickup requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-eco-900/30 border border-eco-500/20 rounded-xl p-4 flex items-start gap-3">
        <Factory className="w-5 h-5 text-eco-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-eco-300 text-sm">Renewable Conversion Note</h4>
          <p className="text-xs text-slate-400 mt-1">
            Collected CO₂ is transported to the renewable conversion plant where it is combined with renewable hydrogen to produce synthetic/renewable fuel, completing the closed carbon-management ecosystem. The roadside device releases treated air after pollutant reduction.
          </p>
        </div>
      </div>
    </div>
  );
}