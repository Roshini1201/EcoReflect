require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let currentDevicesState = [];
let alerts = [];
let carbonLoopRequests = [];

// ==========================================
// ALERT GENERATION
// ==========================================
function checkAndGenerateAlerts(device) {
  if (device.cylinderLevel >= 85) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'CYLINDER_CAPACITY');
    if (!existing) {
      alerts.push({
        id: uuidv4(),
        deviceId: device.device_id,
        type: 'CYLINDER_CAPACITY',
        severity: 'HIGH',
        message: `Cylinder Level: ${device.cylinderLevel.toFixed(1)}%. Pickup Required.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (device.pm25 > 100) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'HIGH_PM25');
    if (!existing) {
      alerts.push({
        id: uuidv4(),
        deviceId: device.device_id,
        type: 'HIGH_PM25',
        severity: 'HIGH',
        message: `PM2.5 Level: ${device.pm25.toFixed(1)} µg/m³. Critical pollution detected.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (device.battery < 20) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'LOW_BATTERY');
    if (!existing) {
      alerts.push({
        id: uuidv4(),
        deviceId: device.device_id,
        type: 'LOW_BATTERY',
        severity: 'MEDIUM',
        message: `Battery Level: ${device.battery.toFixed(1)}%. Maintenance required.`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// ==========================================
// CARBONLOOP REQUEST GENERATION
// ==========================================
function checkAndCreatePickupRequest(device) {
  if (device.cylinderLevel >= 85) {
    const existing = carbonLoopRequests.find(r => r.deviceId === device.device_id && r.status === 'Pickup Required');
    if (!existing) {
      carbonLoopRequests.push({
        id: uuidv4(),
        deviceId: device.device_id,
        status: 'Pickup Required',
        capturedAmount: device.estimatedCO2Captured,
        createdAt: new Date().toISOString()
      });
      console.log(` CarbonLoop Pickup Request created for ${device.device_id}`);
    }
  }
}

// ==========================================
// ESP32 API ENDPOINT
// ==========================================
app.post('/api/telemetry', async (req, res) => {
  const { deviceId, co2, pm25, pm10, nox, so2, temperature, humidity, battery, cylinderLevel, estimatedCO2Captured } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const device = currentDevicesState.find(d => d.device_id === deviceId);
  if (!device) {
    return res.status(404).json({ error: `Device ${deviceId} not found` });
  }

  try {
    await supabase.from('sensor_readings').insert([
      {
        device_id: deviceId,
        co2: co2 ?? null,
        pm25: pm25 ?? null,
        pm10: pm10 ?? null,
        nox: nox ?? null,
        so2: so2 ?? null,
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        battery: battery ?? null,
        cylinder_level: cylinderLevel ?? null,
        co2_captured: estimatedCO2Captured ?? null
      }
    ]);

    let newStatus = 'ACTIVE';
    if ((battery ?? device.battery) < 20) {
      newStatus = 'WARNING';
    } else if ((pm25 ?? device.pm25) > 100 || (cylinderLevel ?? device.cylinderLevel) > 90) {
      newStatus = 'CRITICAL';
    } else if ((pm25 ?? device.pm25) > 75 || (cylinderLevel ?? device.cylinderLevel) > 85) {
      newStatus = 'WARNING';
    }

    await supabase
      .from('devices')
      .update({ last_updated: new Date().toISOString(), status: newStatus })
      .eq('device_id', deviceId);

    device.co2 = co2 ?? device.co2;
    device.pm25 = pm25 ?? device.pm25;
    device.pm10 = pm10 ?? device.pm10;
    device.nox = nox ?? device.nox;
    device.so2 = so2 ?? device.so2;
    device.temperature = temperature ?? device.temperature;
    device.humidity = humidity ?? device.humidity;
    device.battery = battery ?? device.battery;
    device.cylinderLevel = cylinderLevel ?? device.cylinderLevel;
    device.estimatedCO2Captured = estimatedCO2Captured ?? device.estimatedCO2Captured;
    device.status = newStatus;
    device.lastUpdated = new Date().toISOString();

    checkAndGenerateAlerts(device);
    checkAndCreatePickupRequest(device);

    io.emit('devicesUpdate', currentDevicesState);
    io.emit('alertsUpdate', alerts);
    io.emit('carbonLoopUpdate', carbonLoopRequests);

    res.json({ success: true, message: 'Telemetry received' });
  } catch (error) {
    console.error('Telemetry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SIMULATOR
// ==========================================
function startSimulator() {
  console.log('🤖 Starting ESP32 Simulator...');
  
  setInterval(async () => {
    for (const device of currentDevicesState) {
      const newCo2 = Math.max(400, Math.min(1200, device.co2 + (Math.random() - 0.5) * 20));
      const newPm25 = Math.max(10, Math.min(200, device.pm25 + (Math.random() - 0.5) * 5));
      const newPm10 = Math.max(20, Math.min(300, device.pm10 + (Math.random() - 0.5) * 8));
      const newNox = Math.max(10, Math.min(150, device.nox + (Math.random() - 0.5) * 3));
      const newTemperature = Math.max(25, Math.min(45, device.temperature + (Math.random() - 0.5) * 0.5));
      const newHumidity = Math.max(30, Math.min(90, device.humidity + (Math.random() - 0.5) * 1));
      const newBattery = Math.max(0, device.battery - 0.05);
      
      let newCylinder = device.cylinderLevel;
      let newCaptured = device.estimatedCO2Captured;
      
      if (newCylinder < 100) {
        newCylinder = Math.min(100, newCylinder + 0.1);
        newCaptured += 0.05;
      }

      try {
        await fetch(`http://localhost:${process.env.PORT || 4000}/api/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.device_id,
            co2: newCo2,
            pm25: newPm25,
            pm10: newPm10,
            nox: newNox,
            so2: device.so2,
            temperature: newTemperature,
            humidity: newHumidity,
            battery: newBattery,
            cylinderLevel: newCylinder,
            estimatedCO2Captured: newCaptured
          })
        });
      } catch (err) {
        console.error(`Simulator error for ${device.device_id}:`, err.message);
      }
    }
  }, 3000);
}

// ==========================================
// INITIALIZE DEVICES
// ==========================================
async function initializeDevices() {
  console.log(' Fetching devices from Supabase...');
  
  const { data, error } = await supabase.from('devices').select('*');
  
  if (error) {
    console.error('❌ Supabase fetch error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.warn('️  No devices found in Supabase.');
    return;
  }

  // RANDOM starting values WITH GUARANTEED ALERTS for demo
  currentDevicesState = data.map((d, index) => {
    // Force specific devices to be in critical states for demo
    let randomCylinder, randomPM25, randomBattery, randomCO2;
    
    if (index === 0) {
      // ECO-001: High cylinder (will trigger pickup request)
      randomCylinder = 88; // >85% triggers alert
      randomPM25 = 45;
      randomBattery = 75;
      randomCO2 = 650;
    } else if (index === 1) {
      // ECO-002: High PM2.5 (will trigger pollution alert)
      randomCylinder = 55;
      randomPM25 = 115; // >100 triggers alert
      randomBattery = 68;
      randomCO2 = 780;
    } else if (index === 2) {
      // ECO-003: Low battery (will trigger battery alert)
      randomCylinder = 42;
      randomPM25 = 62;
      randomBattery = 15; // <20% triggers alert
      randomCO2 = 520;
    } else if (index === 3) {
      // ECO-004: Normal
      randomCylinder = Math.floor(Math.random() * 40) + 30; // 30-70%
      randomPM25 = Math.floor(Math.random() * 50) + 25; // 25-75
      randomBattery = Math.floor(Math.random() * 30) + 60; // 60-90%
      randomCO2 = Math.floor(Math.random() * 300) + 400; // 400-700
    } else {
      // ECO-005: Critical (both high cylinder AND high PM2.5)
      randomCylinder = 92; // >90% = CRITICAL
      randomPM25 = 125; // >100 = CRITICAL
      randomBattery = 82;
      randomCO2 = 950;
    }
    
    // Determine status based on values
    let status = 'ACTIVE';
    if (randomBattery < 20) status = 'WARNING';
    else if (randomPM25 > 100 || randomCylinder > 90) status = 'CRITICAL';
    else if (randomPM25 > 75 || randomCylinder > 85) status = 'WARNING';

    return {
      device_id: d.device_id,
      device_name: d.device_name,
      location: d.location,
      latitude: d.latitude,
      longitude: d.longitude,
      status: status,
      co2: randomCO2,
      pm25: randomPM25,
      pm10: randomPM25 * 1.5,
      nox: Math.floor(Math.random() * 60) + 20,
      so2: Math.floor(Math.random() * 20) + 5,
      temperature: (Math.random() * 10 + 28).toFixed(1),
      humidity: Math.floor(Math.random() * 30) + 50,
      battery: randomBattery,
      cylinderLevel: randomCylinder,
      estimatedCO2Captured: (Math.random() * 20 + 10).toFixed(1),
      lastUpdated: new Date().toISOString()
    };
  });

  console.log(`✅ Loaded ${currentDevicesState.length} devices with demo-ready values.`);
  currentDevicesState.forEach(d => {
    console.log(`   - ${d.device_id}: Cylinder ${d.cylinderLevel}%, PM2.5 ${d.pm25}, Battery ${d.battery}%, Status ${d.status}`);
  });

  // Generate initial alerts and pickup requests
  currentDevicesState.forEach(device => {
    checkAndGenerateAlerts(device);
    checkAndCreatePickupRequest(device);
  });

  console.log(`📊 Generated ${alerts.length} alerts and ${carbonLoopRequests.length} pickup requests on startup.`);
  console.log(` Alerts ready for demo!`);
}

// ==========================================
// SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.emit('devicesUpdate', currentDevicesState);
  socket.emit('alertsUpdate', alerts);
  socket.emit('carbonLoopUpdate', carbonLoopRequests);

  socket.on('updatePickupStatus', ({ requestId, newStatus }) => {
    const req = carbonLoopRequests.find(r => r.id === requestId);
    if (req) {
      req.status = newStatus;
      if (newStatus === 'Collected' || newStatus === 'Sent to Renewable Plant') {
        const device = currentDevicesState.find(d => d.device_id === req.deviceId);
        if (device) {
          device.cylinderLevel = 5;
          device.status = 'ACTIVE';
        }
      }
      io.emit('carbonLoopUpdate', carbonLoopRequests);
      io.emit('devicesUpdate', currentDevicesState);
    }
  });

  socket.on('disconnect', () => {
    console.log(' Client disconnected:', socket.id);
  });
});

// ==========================================
// START SERVER
// ==========================================
async function startServer() {
  await initializeDevices();

  const PORT = process.env.PORT || 4000;
  
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════╗');
    console.log('║       🌍 EcoReflect Backend Server Started            ');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🔗 Frontend: http://localhost:5173`);
    console.log(`📊 API Endpoint: http://localhost:${PORT}/api/telemetry`);
    console.log('');
    console.log('🤖 ESP32 Simulator: ACTIVE (sends data every 3 seconds)');
    console.log('💾 Database: Supabase Connected');
    console.log(' Real-time Updates: Socket.IO Active');
    console.log('');

    startSimulator();
  });
}

startServer();