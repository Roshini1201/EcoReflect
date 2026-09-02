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
let vehicleCurrentlyDetected = {};

// ==========================================
// ALERT GENERATION
// ==========================================
function checkAndGenerateAlerts(device) {
  if (device.cylinderLevel >= 85) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'CYLINDER_CAPACITY');
    if (!existing) {
      alerts.push({ id: uuidv4(), deviceId: device.device_id, type: 'CYLINDER_CAPACITY', severity: 'HIGH', message: `Cylinder Level: ${device.cylinderLevel.toFixed(1)}%. Pickup Required.`, timestamp: new Date().toISOString() });
    }
  }
  if (device.pm25 > 100) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'HIGH_PM25');
    if (!existing) {
      alerts.push({ id: uuidv4(), deviceId: device.device_id, type: 'HIGH_PM25', severity: 'HIGH', message: `PM2.5 Level: ${device.pm25.toFixed(1)} µg/m³. Critical pollution detected.`, timestamp: new Date().toISOString() });
    }
  }
  if (device.battery < 20) {
    const existing = alerts.find(a => a.deviceId === device.device_id && a.type === 'LOW_BATTERY');
    if (!existing) {
      alerts.push({ id: uuidv4(), deviceId: device.device_id, type: 'LOW_BATTERY', severity: 'MEDIUM', message: `Battery Level: ${device.battery.toFixed(1)}%. Maintenance required.`, timestamp: new Date().toISOString() });
    }
  }
}

// ==========================================
// CARBONLOOP REQUEST (PRIORITY 1 FIX: Check ANY active status)
// ==========================================
function checkAndCreatePickupRequest(device) {
  if (device.cylinderLevel >= 85) {
    const existingRequest = carbonLoopRequests.find(
      r => r.deviceId === device.device_id && !['Completed', 'Cancelled'].includes(r.status)
    );
    
    if (!existingRequest) {
      carbonLoopRequests.push({
        id: uuidv4(),
        deviceId: device.device_id,
        status: 'Pickup Required',
        capturedAmount: device.estimatedCO2Captured,
        createdAt: new Date().toISOString()
      });
      console.log(`🚛 CarbonLoop Pickup Request created for ${device.device_id}`);
    }
  }
}

// ==========================================
// ESP32 API ENDPOINT (PRIORITY 2 FIX: Strict ?? usage)
// ==========================================
app.post('/api/telemetry', async (req, res) => {
  const { deviceId, co2, pm25, pm10, nox, so2, temperature, humidity, battery, cylinderLevel, estimatedCO2Captured } = req.body;

  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

  const device = currentDevicesState.find(d => d.device_id === deviceId);
  if (!device) return res.status(404).json({ error: `Device ${deviceId} not found` });

  try {
    await supabase.from('sensor_readings').insert([{
      device_id: deviceId,
      co2: co2 ?? null, pm25: pm25 ?? null, pm10: pm10 ?? null, nox: nox ?? null, so2: so2 ?? null,
      temperature: temperature ?? null, humidity: humidity ?? null, battery: battery ?? null,
      cylinder_level: cylinderLevel ?? null, co2_captured: estimatedCO2Captured ?? null
    }]);

    let newStatus = 'ACTIVE';
    if ((battery ?? device.battery) < 20) newStatus = 'WARNING';
    else if ((pm25 ?? device.pm25) > 100 || (cylinderLevel ?? device.cylinderLevel) > 90) newStatus = 'CRITICAL';
    else if ((pm25 ?? device.pm25) > 75 || (cylinderLevel ?? device.cylinderLevel) > 85) newStatus = 'WARNING';

    await supabase.from('devices').update({ last_updated: new Date().toISOString(), status: newStatus }).eq('device_id', deviceId);

    // Update in-memory state using ?? to preserve 0 values
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
// VEHICLE EVENT API ENDPOINT
// ==========================================
app.post('/api/vehicle-event', async (req, res) => {
  const { deviceId, distanceCm, vehicleDetected, source = 'SIMULATOR' } = req.body;

  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

  const device = currentDevicesState.find(d => d.device_id === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  try {
    const { data, error } = await supabase
      .from('vehicle_events')
      .insert([{
        device_id: deviceId,
        distance_cm: distanceCm ?? null,
        vehicle_detected: vehicleDetected ?? false,
        source
      }])
      .select()
      .single();

    if (error) {
      console.error('Vehicle event DB error:', error);
      return res.status(500).json({ error: 'Failed to save vehicle event' });
    }

    // Emit real-time event to frontend
    io.emit('vehicleEvent', data);
    res.json({ success: true, event: data });
  } catch (err) {
    console.error('Vehicle event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// PRIORITY 5: DEMO SCENARIO ENDPOINTS
// ==========================================
app.post('/api/demo/scenario', async (req, res) => {
  const { scenario, deviceId } = req.body;
  const device = currentDevicesState.find(d => d.device_id === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  let newTelemetry = { deviceId: device.device_id };

  switch(scenario) {
    case 'normal':
      newTelemetry = { ...newTelemetry, co2: 450, pm25: 25, pm10: 40, nox: 20, battery: 90, cylinderLevel: 40, estimatedCO2Captured: 15.0 };
      break;
    case 'traffic':
      newTelemetry = { ...newTelemetry, co2: 950, pm25: 120, pm10: 170, nox: 85, battery: 85, cylinderLevel: device.cylinderLevel, estimatedCO2Captured: device.estimatedCO2Captured };
      break;
    case 'full-cylinder':
      newTelemetry = { ...newTelemetry, co2: 600, pm25: 45, pm10: 60, nox: 30, battery: 80, cylinderLevel: 88, estimatedCO2Captured: 28.5 };
      break;
    case 'low-battery':
      newTelemetry = { ...newTelemetry, co2: 500, pm25: 30, pm10: 45, nox: 25, battery: 15, cylinderLevel: 50, estimatedCO2Captured: 18.0 };
      break;
    default:
      return res.status(400).json({ error: 'Invalid scenario' });
  }

  // Route through the main telemetry endpoint to ensure DB save + alerts trigger
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 4000}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTelemetry)
    });
    const data = await response.json();
    res.json({ success: true, message: `Scenario '${scenario}' applied to ${deviceId}`, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply scenario' });
  }
});

// ==========================================
// SIMULATOR & INITIALIZATION
// ==========================================
function startSimulator() {
  console.log('🤖 Starting ESP32 Simulator...');
  setInterval(async () => {
    for (const device of currentDevicesState) {
      // ... [KEEP YOUR EXISTING POLLUTION SIMULATION CODE HERE] ...

      // --- NEW: VEHICLE DETECTION SIMULATION ---
      if (!vehicleCurrentlyDetected[device.device_id]) {
        // 15% chance a vehicle enters detection range each cycle
        if (Math.random() < 0.15) {
          vehicleCurrentlyDetected[device.device_id] = true;
          const distance = Math.floor(Math.random() * 150) + 50; // 50-200 cm
          
          try {
            await fetch(`http://localhost:${process.env.PORT || 4000}/api/vehicle-event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                deviceId: device.device_id, 
                distanceCm: distance, 
                vehicleDetected: true, 
                source: 'SIMULATOR' 
              })
            });
          } catch (err) {
            console.error(`Vehicle event fetch error for ${device.device_id}:`, err.message);
          }
        }
      } else {
        // 30% chance the vehicle leaves the detection range
        if (Math.random() < 0.30) {
          vehicleCurrentlyDetected[device.device_id] = false;
        }
      }
    }
  }, 3000);
}

async function initializeDevices() {
  console.log('📡 Fetching devices from Supabase...');
  const { data, error } = await supabase.from('devices').select('*');
  if (error) { console.error('❌ Supabase fetch error:', error.message); return; }
  if (!data || data.length === 0) { console.warn('⚠️ No devices found in Supabase.'); return; }

  currentDevicesState = data.map((d, index) => {
    // Pre-seed with demo-ready values
    let cyl = 40, pm = 30, bat = 85, co2 = 450, status = 'ACTIVE';
    if (index === 0) { cyl = 88; pm = 45; bat = 75; co2 = 650; status = 'WARNING'; } // Full cylinder demo
    if (index === 1) { cyl = 55; pm = 115; bat = 68; co2 = 780; status = 'CRITICAL'; } // Traffic demo
    if (index === 2) { cyl = 42; pm = 62; bat = 15; co2 = 520; status = 'WARNING'; } // Low battery demo

    return { device_id: d.device_id, device_name: d.device_name, location: d.location, latitude: d.latitude, longitude: d.longitude, status, co2, pm25: pm, pm10: pm * 1.5, nox: 30, so2: 10, temperature: 32, humidity: 55, battery: bat, cylinderLevel: cyl, estimatedCO2Captured: 15.0, lastUpdated: new Date().toISOString() };
  });

  currentDevicesState.forEach(device => { checkAndGenerateAlerts(device); checkAndCreatePickupRequest(device); });
  console.log(`✅ Loaded ${currentDevicesState.length} devices. Generated ${alerts.length} alerts and ${carbonLoopRequests.length} pickup requests.`);
}

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
        if (device) { device.cylinderLevel = 5; device.status = 'ACTIVE'; }
      }
      io.emit('carbonLoopUpdate', carbonLoopRequests);
      io.emit('devicesUpdate', currentDevicesState);
    }
  });

  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

async function startServer() {
  await initializeDevices();
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════════════════════╗');
    console.log('║       🌍 EcoCarbon Backend Server Started            ');
    console.log('╚════════════CallableWrapper════════════════════════════════════╝\n');
    console.log(`📡 Server: http://localhost:${PORT} | 🔗 Frontend: http://localhost:5173`);
    console.log('🤖 ESP32 Simulator: ACTIVE | 💾 Database: Supabase Connected\n');
    startSimulator();
  });
}

startServer();