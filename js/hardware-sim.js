/**
 * PARKMATE - Hardware Abstraction Layer & IoT Simulator
 * 
 * ARCHITECTURE NOTICE:
 * This module cleanly separates the application logic from physical IoT and embedded devices.
 * In a physical enterprise deployment, this module connects to real hardware:
 *  - ANPR Optical Cameras via ONVIF/RTSP or HTTP POST Webhooks
 *  - Parking Bay Sensors via MQTT broker (LoRaWAN / Zigbee / BLE mesh)
 *  - Boom Barrier Gates via RS-485 / Wiegand Relay Controllers or Modbus TCP
 * 
 * STATUS: Running in "High-Fidelity Simulation Mode" for rapid prototyping & evaluation.
 * No physical hardware or real AI cameras are claimed or attached in this environment.
 */

class HardwareGatewayBridge {
  constructor(store) {
    this.store = store;
    this.subscribers = [];
    this.barrierState = {
      northGate: 'CLOSED',
      southGate: 'CLOSED'
    };
    this.telemetryLogs = [
      { id: 'tel-1', time: new Date().toLocaleTimeString(), protocol: 'MQTT', topic: 'sensors/bays/b1-01', payload: '{"occupied": true, "voltage": 3.6, "rssi": -68}', status: 'OK' },
      { id: 'tel-2', time: new Date().toLocaleTimeString(), protocol: 'ANPR-WH', topic: 'gates/north/camera-01', payload: '{"plate": "KA-01-MJ-2020", "confidence": 0.98, "status": "VERIFIED_RESIDENT"}', status: 'MATCH' },
      { id: 'tel-3', time: new Date().toLocaleTimeString(), protocol: 'MODBUS', topic: 'relays/barrier-north', payload: '{"command": "PULSE_OPEN", "duration_ms": 5000}', status: 'EXECUTED' }
    ];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => {
      try { cb(); } catch (e) { console.error('HW bridge error:', e); }
    });
  }

  logTelemetry(protocol, topic, payload, status) {
    const entry = {
      id: 'tel-' + Date.now(),
      time: new Date().toLocaleTimeString(),
      protocol,
      topic,
      payload: typeof payload === 'object' ? JSON.stringify(payload) : payload,
      status
    };
    this.telemetryLogs.unshift(entry);
    if (this.telemetryLogs.length > 25) this.telemetryLogs.pop();
    this.notify();
  }

  getTelemetryLogs() {
    return this.telemetryLogs;
  }

  /**
   * Future Integration Hook:
   * Called by the ANPR camera webhooks (e.g., POST /api/v1/gate-camera/event)
   */
  simulateLicensePlateCapture(plateNumber, gateName = 'North Gate') {
    const cleanPlate = plateNumber.toUpperCase().trim();
    const vehicles = this.store.getVehicles();
    const visitors = this.store.getVisitors().filter(v => v.status === 'Active');

    const matchedResidentVehicle = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate.replace(/[^A-Z0-9]/g, ''));
    const matchedVisitorPass = visitors.find(v => v.vehicleNumber.replace(/[^A-Z0-9]/g, '') === cleanPlate.replace(/[^A-Z0-9]/g, ''));

    if (matchedResidentVehicle) {
      this.logTelemetry('ANPR-WH', `gates/${gateName.toLowerCase().replace(' ', '-')}/cam`, {
        plate: cleanPlate,
        matchType: 'RESIDENT',
        flat: matchedResidentVehicle.flat,
        assignedSlot: matchedResidentVehicle.slotId,
        authorized: true
      }, 'AUTHORIZED');

      this.triggerBarrierRelay(gateName, 'OPEN', 6000);
      this.store.logActivity('ENTRY', `[ANPR Sim] Authorized Resident plate recognized: ${cleanPlate} (Flat ${matchedResidentVehicle.flat}) at ${gateName}`);

      return {
        success: true,
        type: 'RESIDENT',
        plate: cleanPlate,
        message: `Resident Vehicle Verified (${matchedResidentVehicle.residentName}, Flat ${matchedResidentVehicle.flat}). Barrier Opened.`,
        vehicle: matchedResidentVehicle
      };
    } else if (matchedVisitorPass) {
      this.logTelemetry('ANPR-WH', `gates/${gateName.toLowerCase().replace(' ', '-')}/cam`, {
        plate: cleanPlate,
        matchType: 'ACTIVE_VISITOR_PASS',
        passId: matchedVisitorPass.id,
        visitingFlat: matchedVisitorPass.visitingFlat,
        authorized: true
      }, 'AUTHORIZED');

      this.triggerBarrierRelay(gateName, 'OPEN', 6000);
      this.store.logActivity('VISITOR', `[ANPR Sim] Visitor plate recognized: ${cleanPlate} (Pass #${matchedVisitorPass.id}, Flat ${matchedVisitorPass.visitingFlat}) at ${gateName}`);

      return {
        success: true,
        type: 'VISITOR',
        plate: cleanPlate,
        message: `Visitor Pass #${matchedVisitorPass.id} Verified (Visiting Flat ${matchedVisitorPass.visitingFlat}). Barrier Opened.`,
        visitor: matchedVisitorPass
      };
    } else {
      this.logTelemetry('ANPR-WH', `gates/${gateName.toLowerCase().replace(' ', '-')}/cam`, {
        plate: cleanPlate,
        matchType: 'UNREGISTERED',
        authorized: false
      }, 'REJECTED');

      this.store.logActivity('ALERT', `[ANPR Sim] Unknown / Unregistered vehicle scanned at ${gateName}: ${cleanPlate}. Security manual verification required.`);

      return {
        success: false,
        type: 'UNREGISTERED',
        plate: cleanPlate,
        message: `Plate ${cleanPlate} is not recognized in Resident or Visitor database! Barrier held closed.`
      };
    }
  }

  /**
   * Future Integration Hook:
   * Called by MQTT message broker receiving ultrasonic/geomagnetic parking slot sensors.
   */
  simulateBaySensorTelemetry(slotId, newState) {
    const slots = this.store.getSlots();
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;

    this.logTelemetry('MQTT', `sensors/bays/${slotId.toLowerCase()}`, {
      slotId,
      state: newState,
      ultrasonic_distance_cm: newState === 'occupied' ? 42 : 280,
      timestamp: Date.now()
    }, 'EVENT_RX');

    this.store.updateSlotStatus(slotId, newState, newState === 'occupied' ? (slot.assignedVehicle || 'Detected') : null);
    return true;
  }

  /**
   * Future Integration Hook:
   * Relay output trigger to physical motor barrier or turnstile.
   */
  triggerBarrierRelay(gateName = 'North Gate', command = 'OPEN', durationMs = 5000) {
    const gateKey = gateName.toLowerCase().includes('south') ? 'southGate' : 'northGate';
    this.barrierState[gateKey] = command;

    this.logTelemetry('MODBUS', `relays/barrier/${gateKey}`, {
      gate: gateName,
      command,
      autoCloseInMs: durationMs
    }, 'TRIGGERED');

    this.notify();

    if (command === 'OPEN') {
      setTimeout(() => {
        this.barrierState[gateKey] = 'CLOSED';
        this.logTelemetry('MODBUS', `relays/barrier/${gateKey}`, {
          gate: gateName,
          status: 'AUTO_CLOSED'
        }, 'CLOSED');
        this.notify();
      }, durationMs);
    }
  }

  getBarrierState(gateName = 'North Gate') {
    const gateKey = gateName.toLowerCase().includes('south') ? 'southGate' : 'northGate';
    return this.barrierState[gateKey];
  }
}

// Attach to window
window.hardwareBridge = new HardwareGatewayBridge(window.parkStore);
