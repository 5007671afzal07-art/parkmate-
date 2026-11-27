/**
 * PARKMATE - Production Backend Server (Node.js + Express + WebSockets)
 * 
 * Features:
 * - REST API for Slots, Residents, Vehicles, Visitors, Violations
 * - WebSocket broadcast for sub-second sync across all connected clients
 * - Built-in static file server for single-command deployment
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'parkmate-cloud-data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Load or initialize database
function loadDb() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading DB, using defaults:', e);
    }
  }
  return {
    slots: [],
    residents: [],
    vehicles: [],
    visitors: [],
    violations: [],
    activity: []
  };
}

function saveDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

let db = loadDb();

// WebSocket: Broadcast updates to all connected devices
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[ParkMate WS] Device connected');
  ws.send(JSON.stringify({ type: 'INIT_STATE', payload: db }));
});

// REST Endpoints
app.get('/api/state', (req, res) => {
  res.json(db);
});

app.post('/api/slots/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, assignedVehicle } = req.body;
  const slot = db.slots.find(s => s.id === id);
  if (slot) {
    slot.status = status;
    if (assignedVehicle !== undefined) slot.assignedVehicle = assignedVehicle;
    slot.lastUpdated = 'Just now';
    saveDb(db);
    broadcast('SLOT_UPDATED', slot);
    return res.json({ success: true, slot });
  }
  res.status(404).json({ error: 'Slot not found' });
});

app.post('/api/visitors', (req, res) => {
  const newPass = {
    id: 'VP-' + Math.floor(1000 + Math.random() * 9000),
    passcode: 'PM-' + Math.floor(100 + Math.random() * 900),
    checkInTime: new Date().toISOString(),
    status: 'Active',
    ...req.body
  };
  db.visitors.unshift(newPass);
  saveDb(db);
  broadcast('VISITOR_ADDED', newPass);
  res.status(201).json(newPass);
});

app.post('/api/violations', (req, res) => {
  const newViolation = {
    id: 'VIO-' + new Date().getFullYear() + '-' + String(db.violations.length + 1).padStart(3, '0'),
    reportedAt: new Date().toISOString(),
    status: 'Under Investigation',
    ...req.body
  };
  db.violations.unshift(newViolation);
  saveDb(db);
  broadcast('VIOLATION_REPORTED', newViolation);
  res.status(201).json(newViolation);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` PARKMATE Production Server running on port ${PORT}`);
  console.log(` Local:   http://localhost:${PORT}`);
  console.log(` WebSockets: ws://localhost:${PORT}`);
  console.log(`====================================================`);
});
