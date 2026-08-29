import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LayoutDashboard, Map, Activity, AlertTriangle, Recycle, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import DeviceDetails from './pages/DeviceDetails';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import CarbonLoop from './pages/CarbonLoop';

const socket = io('http://localhost:4000');

function App() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [carbonLoop, setCarbonLoop] = useState([]);

  useEffect(() => {
    socket.on('devicesUpdate', setDevices);
    socket.on('alertsUpdate', setAlerts);
    socket.on('carbonLoopUpdate', setCarbonLoop);
    return () => {
      socket.off('devicesUpdate');
      socket.on('alertsUpdate');
      socket.off('carbonLoopUpdate');
    };
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-dark-900 text-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard devices={devices} alerts={alerts} carbonLoop={carbonLoop} />} />
            <Route path="/map" element={<LiveMap devices={devices} />} />
            <Route path="/device/:id" element={<DeviceDetails devices={devices} />} />
            <Route path="/analytics" element={<Analytics devices={devices} />} />
            <Route path="/alerts" element={<Alerts alerts={alerts} />} />
            <Route path="/carbonloop" element={<CarbonLoop requests={carbonLoop} socket={socket} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Sidebar() {
  const location = useLocation();
  const menu = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Map, label: 'Live Pollution Map', path: '/map' },
    { icon: Activity, label: 'Analytics', path: '/analytics' },
    { icon: Recycle, label: 'CarbonLoop Logistics', path: '/carbonloop' },
    { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
  ];

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <h1 className="text-2xl font-bold text-eco-400 flex items-center gap-2">
          <Recycle className="w-8 h-8" /> EcoReflect
        </h1>
        <p className="text-xs text-slate-400 mt-1">Smart Environmental Monitoring</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menu.map((item) => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-eco-800 text-eco-300' : 'text-slate-400 hover:bg-dark-700 hover:text-slate-100'}`}>
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-2 h-2 rounded-full bg-eco-500 animate-pulse"></div>
          <span className="text-sm">LoRaWAN Gateway: Connected</span>
        </div>
      </div>
    </aside>
  );
}

export default App;