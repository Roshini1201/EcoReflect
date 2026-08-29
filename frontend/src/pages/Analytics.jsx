import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Analytics({ devices }) {
  // Generate mock historical data based on current device states
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const data = [];
    for (let i = 10; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      data.push({
        time,
        co2: 450 + Math.random() * 400,
        pm25: 30 + Math.random() * 60,
        nox: 20 + Math.random() * 50,
        captured: 15 + Math.random() * 20
      });
    }
    setHistoryData(data);
    
    const interval = setInterval(() => {
      setHistoryData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          co2: 450 + Math.random() * 400,
          pm25: 30 + Math.random() * 60,
          nox: 20 + Math.random() * 50,
          captured: prev[prev.length - 1].captured + 0.1
        });
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Environmental Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">CO₂ Concentration (ppm) over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
              <Line type="monotone" dataKey="co2" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">PM2.5 & NOx Levels</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
              <Legend />
              <Line type="monotone" dataKey="pm25" stroke="#f59e0b" strokeWidth={2} dot={false} name="PM2.5" />
              <Line type="monotone" dataKey="nox" stroke="#3b82f6" strokeWidth={2} dot={false} name="NOx" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Estimated CO₂ Captured (kg) - Cumulative</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
              <Bar dataKey="captured" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}