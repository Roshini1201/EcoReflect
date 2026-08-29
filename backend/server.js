const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

// Initial Mock Devices
const devices = [
  { deviceId: 'ECO-001', deviceName: 'Highway Junction A', location: 'NH-48, Sector 12', lat: 28.6139, lng: 77.2090, co2: 450, pm25: 35, pm10: 55, nox: 40, so2: 12, temperature: 32, humidity: 55, battery: 92, cylinderLevel: 45, estimatedCO2Captured: 12.5, status: 'ACTIVE', lastUpdated: new Date().toISOString() },
  { deviceId: 'ECO-002', deviceName: 'Industrial Zone B', location: 'Midc Area, Phase 2', lat: 28.6200, lng: 77.2150, co2: 850, pm25: 88, pm10: 120, nox: 75, so2: 25, temperature: 34, humidity: 50, battery: 78, cylinderLevel: 88, estimatedCO2Captured: 28.3, status: 'ACTIVE', lastUpdated: new Date().toISOString() },
  { deviceId: 'ECO-003', deviceName: 'City Center Hub', location: 'Connaught Place', lat: 28.6304, lng: 77.2177, co2: 600, pm25: 55, pm10: 80, nox: 50, so2: 15, temperature: 31, humidity: 58, battery: 85, cylinderLevel: 60, estimatedCO2Captured: 18.1, status: 'ACTIVE', lastUpdated: new Date().toISOString() },
  { deviceId: 'ECO-004', deviceName: 'Residential Block C', location: 'Dwarka Sector 9', lat: 28.5921, lng: 77.0460, co2: 410, pm25: 25, pm10: 40, nox: 20, so2: 8, temperature: 30, humidity: 60, battery: 15, cylinderLevel: 30, estimatedCO2Captured: 8.4, status: 'WARNING', lastUpdated: new Date().toISOString() },
  { deviceId: 'ECO-005', deviceName: 'Port Entry Gate', location: 'Mumbai Port Trust', lat: 18.9388, lng: 72.8354, co2: 920, pm25: 110, pm10: 150, nox: 90, so2: 35, temperature: 33, humidity: 65, battery: 45, cylinderLevel: 92, estimatedCO2Captured: 35.0, status: 'CRITICAL', lastUpdated: new Date().toISOString() }
];

let alerts = [];
let carbonLoopRequests = [
  { id: uuidv4(), deviceId: 'ECO-002', status: 'Truck Assigned', capturedAmount: 28.3, createdAt: new Date().toISOString() }
];

// Simulation Engine (Replaces future LoRaWAN/MQTT ingestion)
setInterval(() => {
  devices.forEach(device => {
    if (device.status === 'OFFLINE') return;

    // Random walk for sensor data
    device.co2 = Math.max(400, Math.min(1200, device.co2 + (Math.random() - 0.5) * 20));
    device.pm25 = Math.max(10, Math.min(200, device.pm25 + (Math.random() - 0.5) * 5));
    device.pm10 = Math.max(20, Math.min(300, device.pm10 + (Math.random() - 0.5) * 8));
    device.nox = Math.max(10, Math.min(150, device.nox + (Math.random() - 0.5) * 3));
    device.temperature = Math.max(25, Math.min(45, device.temperature + (Math.random() - 0.5) * 0.5));
    device.humidity = Math.max(30, Math.min(90, device.humidity + (Math.random() - 0.5) * 1));
    
    // Battery drain and CO2 capture simulation
    device.battery = Math.max(0, device.battery - 0.05);
    if (device.cylinderLevel < 100) {
      device.cylinderLevel = Math.min(100, device.cylinderLevel + 0.1);
      device.estimatedCO2Captured += 0.05;
    }

    // Status Logic
    if (device.battery < 20) device.status = 'WARNING';
    if (device.pm25 > 100 || device.cylinderLevel > 90) device.status = 'CRITICAL';
    else if (device.pm25 > 75 || device.cylinderLevel > 85) device.status = 'WARNING';
    else device.status = 'ACTIVE';

    device.lastUpdated = new Date().toISOString();

    // Alert Generation
    if (device.cylinderLevel > 85 && !alerts.find(a => a.deviceId === device.deviceId && a.type === 'CYLINDER_FULL')) {
      const alert = { id: uuidv4(), deviceId: device.deviceId, type: 'CYLINDER_FULL', message: `Cylinder Level: ${device.cylinderLevel.toFixed(1)}%. Pickup Required.`, severity: 'HIGH', timestamp: new Date().toISOString() };
      alerts.push(alert);
      
      // Auto-create CarbonLoop request
      carbonLoopRequests.push({
        id: uuidv4(),
        deviceId: device.deviceId,
        status: 'Pickup Required',
        capturedAmount: device.estimatedCO2Captured,
        createdAt: new Date().toISOString()
      });
    }
    
    if (device.battery < 20 && !alerts.find(a => a.deviceId === device.deviceId && a.type === 'LOW_BATTERY')) {
      alerts.push({ id: uuidv4(), deviceId: device.deviceId, type: 'LOW_BATTERY', message: `Battery Level: ${device.battery.toFixed(1)}%.`, severity: 'MEDIUM', timestamp: new Date().toISOString() });
    }
  });

  // Emit real-time updates
  io.emit('devicesUpdate', devices);
  io.emit('alertsUpdate', alerts);
  io.emit('carbonLoopUpdate', carbonLoopRequests);
}, 3000); // Update every 3 seconds

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('devicesUpdate', devices);
  socket.emit('alertsUpdate', alerts);
  socket.emit('carbonLoopUpdate', carbonLoopRequests);

  socket.on('updatePickupStatus', ({ requestId, newStatus }) => {
    const req = carbonLoopRequests.find(r => r.id === requestId);
    if (req) {
      req.status = newStatus;
      if (newStatus === 'Collected' || newStatus === 'Sent to Renewable Plant') {
        const device = devices.find(d => d.deviceId === req.deviceId);
        if (device) {
          device.cylinderLevel = 5; // Reset cylinder
          device.status = 'ACTIVE';
        }
      }
      io.emit('carbonLoopUpdate', carbonLoopRequests);
      io.emit('devicesUpdate', devices);
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`EcoReflect Backend running on port ${PORT}`));