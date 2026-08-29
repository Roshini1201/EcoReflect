import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Battery, Wind, Droplets, Thermometer, AlertCircle } from 'lucide-react';

export default function DeviceDetails({ devices }) {
  const { id } = useParams();
  const device = devices.find(d => d.deviceId === id);

  if (!device) return <div className="p-6">Device not found</div>;

  const getStatusColor = (status) => {
    if (status === 'ACTIVE') return 'text-eco-400 bg-eco-500/10 border-eco-500/20';
    if (status === 'WARNING') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (status === 'CRITICAL') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      <Link to="/map" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-4 h-4" /> Back to Map
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">{device.deviceName}</h2>
          <p className="text-slate-400">{device.location} • {device.deviceId}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(device.status)}`}>
          {device.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gauges */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wind className="w-5 h-5 text-eco-400"/> CO₂ Cylinder Level</h3>
          <div className="relative pt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Capacity</span>
              <span className="font-bold text-slate-200">{device.cylinderLevel.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-dark-900 rounded-full h-4">
              <div className={`h-4 rounded-full transition-all duration-500 ${device.cylinderLevel > 85 ? 'bg-red-500' : 'bg-eco-500'}`} style={{ width: `${device.cylinderLevel}%` }}></div>
            </div>
            {device.cylinderLevel > 85 && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Pickup Required</p>
            )}
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Battery className="w-5 h-5 text-yellow-400"/> Battery Level</h3>
          <div className="relative pt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Charge</span>
              <span className="font-bold text-slate-200">{device.battery.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-dark-900 rounded-full h-4">
              <div className={`h-4 rounded-full transition-all duration-500 ${device.battery < 20 ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${device.battery}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-400"/> Pollution Index</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">PM2.5</span>
              <span className={`font-bold ${device.pm25 > 75 ? 'text-red-400' : 'text-slate-200'}`}>{device.pm25.toFixed(0)} µg/m³</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">PM10</span>
              <span className="font-bold text-slate-200">{device.pm10.toFixed(0)} µg/m³</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">NOx</span>
              <span className="font-bold text-slate-200">{device.nox.toFixed(0)} ppb</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Environmental Conditions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-dark-900 rounded-lg">
            <Thermometer className="w-6 h-6 text-orange-400 mb-2" />
            <p className="text-slate-400 text-xs">Temperature</p>
            <p className="text-xl font-bold">{device.temperature.toFixed(1)} °C</p>
          </div>
          <div className="p-4 bg-dark-900 rounded-lg">
            <Droplets className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-slate-400 text-xs">Humidity</p>
            <p className="text-xl font-bold">{device.humidity.toFixed(1)} %</p>
          </div>
          <div className="p-4 bg-dark-900 rounded-lg">
            <Wind className="w-6 h-6 text-eco-400 mb-2" />
            <p className="text-slate-400 text-xs">CO₂ Concentration</p>
            <p className="text-xl font-bold">{device.co2.toFixed(0)} ppm</p>
          </div>
          <div className="p-4 bg-dark-900 rounded-lg">
            <AlertCircle className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-slate-400 text-xs">Est. CO₂ Captured</p>
            <p className="text-xl font-bold">{device.estimatedCO2Captured.toFixed(1)} kg</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center">Output: Treated air after pollutant reduction. CO₂ is securely stored in the cylinder for CarbonLoop processing.</p>
      </div>
    </div>
  );
}