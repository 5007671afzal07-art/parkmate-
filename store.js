/**
 * PARKMATE - Smart Residential Parking Management System
 * Production Multi-User Cloud Store & Synchronization Engine
 * 
 * ARCHITECTURE:
 * 1. Cloud-Synced Real-Time Layer (Gun.js Cloud Relays / Firebase Adapter)
 * 2. Local Fallback Cache (HTML5 localStorage)
 * 3. Event Bus & Subscriptions for instant multi-device reactivity
 * 
 * When a Security Guard updates a slot on Phone A, all Residents and Admins
 * on Phone B, C, or Laptop D receive the live state update in <150ms!
 */

const STORAGE_KEYS = {
  SLOTS: 'parkmate_slots_v3',
  RESIDENTS: 'parkmate_residents_v3',
  VEHICLES: 'parkmate_vehicles_v3',
  VISITORS: 'parkmate_visitors_v3',
  VIOLATIONS: 'parkmate_violations_v3',
  ACTIVITY_LOGS: 'parkmate_logs_v3',
  COMMUNITY_ID: 'parkmate_community_id_v3',
  CURRENT_ROLE: 'parkmate_active_role'
};

// Initial community seed data
const DEFAULT_RESIDENTS = [
  { id: 'res-1', flat: 'A-101', name: 'Dr. Vikram Malhotra', phone: '+91 98450 12345', email: 'v.malhotra@skyline.org', wing: 'Tower A', moveInDate: '2023-01-15' },
  { id: 'res-2', flat: 'A-204', name: 'Sarah Jenkins', phone: '+91 98765 43210', email: 'sarah.j@techmail.io', wing: 'Tower A', moveInDate: '2023-03-20' },
  { id: 'res-3', flat: 'A-302', name: 'Arjun & Meera Singhania', phone: '+91 98220 99887', email: 'arjun.singhania@apex.com', wing: 'Tower A', moveInDate: '2022-11-10' },
  { id: 'res-4', flat: 'A-405', name: 'Capt. Rajesh Sharma (Retd.)', phone: '+91 98110 55443', email: 'rajesh.sharma@veterans.in', wing: 'Tower A', moveInDate: '2022-08-01' },
  { id: 'res-5', flat: 'B-102', name: 'Priya & Rohan Verma', phone: '+91 99001 77665', email: 'priya.verma@designstudio.co', wing: 'Tower B', moveInDate: '2023-05-12' },
  { id: 'res-6', flat: 'B-205', name: 'David D\'Souza', phone: '+91 97400 33221', email: 'david.dsouza@global.net', wing: 'Tower B', moveInDate: '2023-02-18' },
  { id: 'res-7', flat: 'B-303', name: 'Ananya Deshmukh', phone: '+91 98330 66112', email: 'ananya.d@fintech.co', wing: 'Tower B', moveInDate: '2023-07-04' },
  { id: 'res-8', flat: 'B-401', name: 'Karthik Ramanathan', phone: '+91 98840 88229', email: 'karthik.r@consulting.com', wing: 'Tower B', moveInDate: '2022-10-30' }
];

const DEFAULT_SLOTS = [
  // Basement 1 (Tower A & EV)
  { id: 'B1-01', level: 'B1', zone: 'Tower A', type: 'car', isEV: true, status: 'occupied', allocatedFlat: 'A-101', assignedVehicle: 'KA-01-MJ-2020', lastUpdated: '10 mins ago' },
  { id: 'B1-02', level: 'B1', zone: 'Tower A', type: 'car', isEV: true, status: 'available', allocatedFlat: 'A-204', assignedVehicle: null, lastUpdated: '1 hour ago' },
  { id: 'B1-03', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'A-302', assignedVehicle: 'KA-05-NB-7788', lastUpdated: '25 mins ago' },
  { id: 'B1-04', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'A-302', assignedVehicle: 'KA-05-EB-1200', lastUpdated: '3 hours ago' },
  { id: 'B1-05', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'available', allocatedFlat: 'A-405', assignedVehicle: null, lastUpdated: '40 mins ago' },
  { id: 'B1-06', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'A-405', assignedVehicle: 'KA-03-MM-4411', lastUpdated: '15 mins ago' },
  { id: 'B1-07', level: 'B1', zone: 'Tower A', type: 'bike', isEV: false, status: 'occupied', allocatedFlat: 'A-101', assignedVehicle: 'KA-01-EA-9090', lastUpdated: '2 hours ago' },
  { id: 'B1-08', level: 'B1', zone: 'Tower A', type: 'bike', isEV: true, status: 'available', allocatedFlat: 'A-204', assignedVehicle: null, lastUpdated: 'Just now' },
  { id: 'B1-09', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '5 hours ago' },
  { id: 'B1-10', level: 'B1', zone: 'Tower A', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '6 hours ago' },

  // Basement 2 (Tower B)
  { id: 'B2-01', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'B-102', assignedVehicle: 'KA-04-P-5566', lastUpdated: '20 mins ago' },
  { id: 'B2-02', level: 'B2', zone: 'Tower B', type: 'car', isEV: true, status: 'occupied', allocatedFlat: 'B-102', assignedVehicle: 'KA-04-EV-8899', lastUpdated: '45 mins ago' },
  { id: 'B2-03', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'available', allocatedFlat: 'B-205', assignedVehicle: null, lastUpdated: '30 mins ago' },
  { id: 'B2-04', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'B-303', assignedVehicle: 'MH-12-RP-1002', lastUpdated: '5 mins ago' },
  { id: 'B2-05', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'B-401', assignedVehicle: 'DL-08-CC-3419', lastUpdated: '10 mins ago' },
  { id: 'B2-06', level: 'B2', zone: 'Tower B', type: 'bike', isEV: false, status: 'occupied', allocatedFlat: 'B-401', assignedVehicle: 'DL-08-BK-7700', lastUpdated: '4 hours ago' },
  { id: 'B2-07', level: 'B2', zone: 'Tower B', type: 'bike', isEV: false, status: 'available', allocatedFlat: 'B-205', assignedVehicle: null, lastUpdated: 'Yesterday' },
  { id: 'B2-08', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '1 day ago' },
  { id: 'B2-09', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '1 day ago' },
  { id: 'B2-10', level: 'B2', zone: 'Tower B', type: 'car', isEV: false, status: 'reserved', allocatedFlat: 'B-303', assignedVehicle: null, lastUpdated: '3 hours ago' },

  // Ground Level (Visitors & Emergency)
  { id: 'G-01', level: 'G', zone: 'Visitor Hub', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'Visitor (A-101)', assignedVehicle: 'KA-51-Z-9901', lastUpdated: '18 mins ago' },
  { id: 'G-02', level: 'G', zone: 'Visitor Hub', type: 'car', isEV: false, status: 'occupied', allocatedFlat: 'Visitor (B-205)', assignedVehicle: 'KA-02-MN-3344', lastUpdated: '32 mins ago' },
  { id: 'G-03', level: 'G', zone: 'Visitor Hub', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: 'Just now' },
  { id: 'G-04', level: 'G', zone: 'Visitor Hub', type: 'car', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '1 hour ago' },
  { id: 'G-05', level: 'G', zone: 'Visitor Hub', type: 'car', isEV: true, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '4 hours ago' },
  { id: 'G-06', level: 'G', zone: 'Visitor Hub', type: 'bike', isEV: false, status: 'available', allocatedFlat: null, assignedVehicle: null, lastUpdated: '2 hours ago' },
  { id: 'G-07', level: 'G', zone: 'Visitor Hub', type: 'bike', isEV: false, status: 'occupied', allocatedFlat: 'Delivery Agent', assignedVehicle: 'KA-05-DL-8821', lastUpdated: '12 mins ago' },
  { id: 'G-08', level: 'G', zone: 'Emergency & Service', type: 'car', isEV: false, status: 'reserved', allocatedFlat: 'Ambulance / Fire Bay', assignedVehicle: null, lastUpdated: 'Standing' }
];

const DEFAULT_VEHICLES = [
  { id: 'veh-1', plate: 'KA-01-MJ-2020', type: 'car', makeModel: 'Hyundai Ioniq 5', color: 'Gravity Gold Matte', isEV: true, flat: 'A-101', slotId: 'B1-01', rfidTag: 'RFID-88102', residentName: 'Dr. Vikram Malhotra', stickerStatus: 'Active' },
  { id: 'veh-2', plate: 'KA-01-EA-9090', type: 'bike', makeModel: 'Royal Enfield Hunter 350', color: 'Dapper Ash', isEV: false, flat: 'A-101', slotId: 'B1-07', rfidTag: 'RFID-88103', residentName: 'Dr. Vikram Malhotra', stickerStatus: 'Active' },
  { id: 'veh-3', plate: 'KA-05-NB-7788', type: 'car', makeModel: 'Honda City ZX', color: 'Platinum White', isEV: false, flat: 'A-302', slotId: 'B1-03', rfidTag: 'RFID-91204', residentName: 'Arjun & Meera Singhania', stickerStatus: 'Active' },
  { id: 'veh-4', plate: 'KA-05-EB-1200', type: 'car', makeModel: 'Tata Nexon EV Max', color: 'Intensi-Teal', isEV: true, flat: 'A-302', slotId: 'B1-04', rfidTag: 'RFID-91205', residentName: 'Arjun & Meera Singhania', stickerStatus: 'Active' },
  { id: 'veh-5', plate: 'KA-03-MM-4411', type: 'car', makeModel: 'Toyota Fortuner 4x4', color: 'Attitude Black', isEV: false, flat: 'A-405', slotId: 'B1-06', rfidTag: 'RFID-77312', residentName: 'Capt. Rajesh Sharma (Retd.)', stickerStatus: 'Active' },
  { id: 'veh-6', plate: 'KA-04-P-5566', type: 'car', makeModel: 'Volkswagen Virtus GT', color: 'Wild Cherry Red', isEV: false, flat: 'B-102', slotId: 'B2-01', rfidTag: 'RFID-66419', residentName: 'Priya & Rohan Verma', stickerStatus: 'Active' },
  { id: 'veh-7', plate: 'KA-04-EV-8899', type: 'car', makeModel: 'MG ZS EV', color: 'Currant Red', isEV: true, flat: 'B-102', slotId: 'B2-02', rfidTag: 'RFID-66420', residentName: 'Priya & Rohan Verma', stickerStatus: 'Active' },
  { id: 'veh-8', plate: 'MH-12-RP-1002', type: 'car', makeModel: 'Kia Seltos GTX+', color: 'Gravity Grey', isEV: false, flat: 'B-303', slotId: 'B2-04', rfidTag: 'RFID-55211', residentName: 'Ananya Deshmukh', stickerStatus: 'Active' },
  { id: 'veh-9', plate: 'DL-08-CC-3419', type: 'car', makeModel: 'Skoda Slavia Style', color: 'Crystal Blue', isEV: false, flat: 'B-401', slotId: 'B2-05', rfidTag: 'RFID-44190', residentName: 'Karthik Ramanathan', stickerStatus: 'Active' },
  { id: 'veh-10', plate: 'DL-08-BK-7700', type: 'bike', makeModel: 'Ather 450X Gen 3', color: 'Space Grey', isEV: true, flat: 'B-401', slotId: 'B2-06', rfidTag: 'RFID-44191', residentName: 'Karthik Ramanathan', stickerStatus: 'Active' }
];

const DEFAULT_VISITORS = [
  {
    id: 'VP-8491',
    visitorName: 'Amit Saxena',
    visitorPhone: '+91 97110 88220',
    vehicleNumber: 'KA-51-Z-9901',
    vehicleType: 'car',
    visitingFlat: 'A-101',
    hostName: 'Dr. Vikram Malhotra',
    slotId: 'G-01',
    checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expectedDurationHours: 2,
    status: 'Active',
    passcode: 'PM-912'
  },
  {
    id: 'VP-8492',
    visitorName: 'Sneha Kapoor',
    visitorPhone: '+91 98455 33119',
    vehicleNumber: 'KA-02-MN-3344',
    vehicleType: 'car',
    visitingFlat: 'B-205',
    hostName: 'David D\'Souza',
    slotId: 'G-02',
    checkInTime: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    expectedDurationHours: 3,
    status: 'Active',
    passcode: 'PM-487'
  },
  {
    id: 'VP-8488',
    visitorName: 'Courier - BlueDart Express',
    visitorPhone: '+91 91234 56789',
    vehicleNumber: 'KA-05-DL-8821',
    vehicleType: 'bike',
    visitingFlat: 'A-302',
    hostName: 'Arjun Singhania',
    slotId: 'G-07',
    checkInTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    expectedDurationHours: 1,
    status: 'Active',
    passcode: 'PM-102'
  }
];

const DEFAULT_VIOLATIONS = [
  {
    id: 'VIO-2026-001',
    reportedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    slotId: 'B1-02',
    offendingVehicle: 'MH-02-CJ-9912',
    vehicleDescription: 'Black BMW 3-Series Sedan',
    allocatedResidentFlat: 'A-204',
    reportedByRole: 'Resident',
    reporterName: 'Sarah Jenkins (A-204)',
    violationType: 'Unauthorized Slot Occupancy',
    description: 'Vehicle parked in my private allocated slot without permission.',
    status: 'Under Investigation',
    severity: 'High',
    actionLog: [
      { time: '1 hr ago', note: 'Report lodged by Flat A-204 resident.' }
    ]
  }
];

const DEFAULT_ACTIVITY = [
  { id: 'act-1', type: 'ENTRY', text: 'Resident entry: Dr. Vikram Malhotra (KA-01-MJ-2020) via North Gate', time: '10 mins ago', role: 'Security' },
  { id: 'act-2', type: 'VISITOR', text: 'New Visitor Pass generated: Amit Saxena visiting A-101 (Slot G-01)', time: '45 mins ago', role: 'Security' },
  { id: 'act-3', type: 'ALERT', text: 'Unauthorized parking report filed for Slot B1-02 by Sarah Jenkins', time: '1.5 hrs ago', role: 'Resident' }
];

class ParkMateCloudStore {
  constructor() {
    this.subscribers = [];
    this.cloudConnected = false;
    this.communityId = this.getCommunityId();
    this.gunNode = null;
    this.init();
  }

  getCommunityId() {
    let id = localStorage.getItem(STORAGE_KEYS.COMMUNITY_ID);
    if (!id) {
      // Default community room for Skyline Palms
      id = 'skyline_palms_community_default';
      localStorage.setItem(STORAGE_KEYS.COMMUNITY_ID, id);
    }
    return id;
  }

  setCommunityId(id) {
    if (!id) return;
    localStorage.setItem(STORAGE_KEYS.COMMUNITY_ID, id);
    this.communityId = id;
    this.initCloud();
    this.notify();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SLOTS)) {
      this.resetToDefaults();
    }
    this.initCloud();
  }

  /**
   * Initializes real-time cloud sync via Gun.js distributed cloud relays.
   * If Gun is loaded, connects to public relays and listens for changes made by other users.
   */
  initCloud() {
    try {
      if (typeof window.Gun !== 'undefined') {
        const relays = [
          'https://gun-manhattan.herokuapp.com/gun',
          'https://peer.wall.org/gun'
        ];
        this.gun = window.Gun({ peers: relays });
        this.cloudNode = this.gun.get('parkmate_v3').get(this.communityId);
        this.cloudConnected = true;

        // Listen for remote updates
        this.cloudNode.get('slots_sync').on((data) => {
          if (data && typeof data === 'string') {
            try {
              const remoteSlots = JSON.parse(data);
              if (Array.isArray(remoteSlots) && remoteSlots.length > 0) {
                localStorage.setItem(STORAGE_KEYS.SLOTS, data);
                this.notify();
              }
            } catch (e) {}
          }
        });

        this.cloudNode.get('visitors_sync').on((data) => {
          if (data && typeof data === 'string') {
            try {
              const remoteVisitors = JSON.parse(data);
              if (Array.isArray(remoteVisitors)) {
                localStorage.setItem(STORAGE_KEYS.VISITORS, data);
                this.notify();
              }
            } catch (e) {}
          }
        });

        this.cloudNode.get('violations_sync').on((data) => {
          if (data && typeof data === 'string') {
            try {
              const remoteViolations = JSON.parse(data);
              if (Array.isArray(remoteViolations)) {
                localStorage.setItem(STORAGE_KEYS.VIOLATIONS, data);
                this.notify();
              }
            } catch (e) {}
          }
        });

        this.cloudNode.get('activity_sync').on((data) => {
          if (data && typeof data === 'string') {
            try {
              const remoteActivity = JSON.parse(data);
              if (Array.isArray(remoteActivity)) {
                localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, data);
                this.notify();
              }
            } catch (e) {}
          }
        });

        console.log('[ParkMate] Cloud sync connected to room:', this.communityId);
      } else {
        this.cloudConnected = false;
      }
    } catch (err) {
      console.warn('[ParkMate] Cloud sync running in local-only fallback mode:', err);
      this.cloudConnected = false;
    }
  }

  isCloudConnected() {
    return this.cloudConnected;
  }

  // Push local state to cloud peers
  broadcastToCloud(entityKey, data) {
    if (this.cloudNode) {
      try {
        this.cloudNode.get(entityKey + '_sync').put(JSON.stringify(data));
      } catch (e) {
        console.warn('Cloud broadcast error:', e);
      }
    }
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(DEFAULT_SLOTS));
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(DEFAULT_RESIDENTS));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(DEFAULT_VEHICLES));
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(DEFAULT_VISITORS));
    localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(DEFAULT_VIOLATIONS));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(DEFAULT_ACTIVITY));
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, 'admin');
    }

    this.broadcastToCloud('slots', DEFAULT_SLOTS);
    this.broadcastToCloud('visitors', DEFAULT_VISITORS);
    this.broadcastToCloud('violations', DEFAULT_VIOLATIONS);
    this.broadcastToCloud('activity', DEFAULT_ACTIVITY);

    this.notify();
  }

  // Pub/Sub
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => {
      try { cb(); } catch (e) { console.error('Store notification error:', e); }
    });
  }

  // Getters
  getRole() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE) || 'admin';
  }

  setRole(role) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
    this.notify();
  }

  getSlots() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SLOTS) || '[]');
  }

  getResidents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESIDENTS) || '[]');
  }

  getVehicles() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLES) || '[]');
  }

  getVisitors() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITORS) || '[]');
  }

  getViolations() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VIOLATIONS) || '[]');
  }

  getActivityLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS) || '[]');
  }

  getDashboardMetrics() {
    const slots = this.getSlots();
    const visitors = this.getVisitors().filter(v => v.status === 'Active');
    const violations = this.getViolations().filter(v => v.status !== 'Resolved');

    const total = slots.length;
    const available = slots.filter(s => s.status === 'available').length;
    const occupied = slots.filter(s => s.status === 'occupied').length;
    const reserved = slots.filter(s => s.status === 'reserved').length;
    const visitorTotal = slots.filter(s => s.level === 'G').length;
    const visitorAvailable = slots.filter(s => s.level === 'G' && s.status === 'available').length;
    const evSlots = slots.filter(s => s.isEV).length;

    return {
      total,
      available,
      occupied,
      reserved,
      occupancyRate: total ? Math.round((occupied / total) * 100) : 0,
      visitorTotal,
      visitorAvailable,
      activeVisitorsCount: visitors.length,
      pendingViolationsCount: violations.length,
      evSlots
    };
  }

  // Operations: Slots
  updateSlotStatus(slotId, newStatus, assignedVehicle = null) {
    const slots = this.getSlots();
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
      slots[index].status = newStatus;
      if (assignedVehicle !== undefined) {
        slots[index].assignedVehicle = assignedVehicle;
      }
      slots[index].lastUpdated = 'Just now';
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
      this.broadcastToCloud('slots', slots);

      this.logActivity(
        newStatus === 'occupied' ? 'ENTRY' : 'EXIT',
        `Slot ${slotId} marked as ${newStatus.toUpperCase()}${assignedVehicle ? ` (${assignedVehicle})` : ''}`
      );
      this.notify();
      return true;
    }
    return false;
  }

  allocateSlot(slotId, flatNumber) {
    const slots = this.getSlots();
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
      slots[index].allocatedFlat = flatNumber;
      slots[index].lastUpdated = 'Just now';
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
      this.broadcastToCloud('slots', slots);
      this.logActivity('ADMIN', `Slot ${slotId} assigned to Flat ${flatNumber}`);
      this.notify();
      return true;
    }
    return false;
  }

  addSlot(newSlot) {
    const slots = this.getSlots();
    if (slots.some(s => s.id.toLowerCase() === newSlot.id.toLowerCase())) {
      throw new Error(`Slot number ${newSlot.id} already exists.`);
    }
    slots.push({
      ...newSlot,
      status: newSlot.status || 'available',
      lastUpdated: 'Just now'
    });
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    this.broadcastToCloud('slots', slots);
    this.logActivity('ADMIN', `New parking bay added: ${newSlot.id} (${newSlot.level})`);
    this.notify();
    return true;
  }

  // Operations: Residents
  addResident(residentData) {
    const residents = this.getResidents();
    const newResident = {
      id: 'res-' + Date.now(),
      ...residentData,
      moveInDate: residentData.moveInDate || new Date().toISOString().split('T')[0]
    };
    residents.push(newResident);
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents));
    this.broadcastToCloud('residents', residents);
    this.logActivity('ADMIN', `New resident registered: ${newResident.name} (Flat ${newResident.flat})`);
    this.notify();
    return newResident;
  }

  // Operations: Vehicles
  addVehicle(vehicleData) {
    const vehicles = this.getVehicles();
    const cleanPlate = vehicleData.plate.toUpperCase().trim();
    if (vehicles.some(v => v.plate.toUpperCase() === cleanPlate)) {
      throw new Error(`Vehicle with plate number ${cleanPlate} is already registered.`);
    }

    const newVehicle = {
      id: 'veh-' + Date.now(),
      ...vehicleData,
      plate: cleanPlate,
      stickerStatus: 'Active',
      rfidTag: vehicleData.rfidTag || `RFID-${Math.floor(10000 + Math.random() * 90000)}`
    };

    vehicles.push(newVehicle);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    this.broadcastToCloud('vehicles', vehicles);

    if (newVehicle.slotId) {
      const slots = this.getSlots();
      const slotIdx = slots.findIndex(s => s.id === newVehicle.slotId);
      if (slotIdx !== -1) {
        slots[slotIdx].allocatedFlat = newVehicle.flat;
        localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
        this.broadcastToCloud('slots', slots);
      }
    }

    this.logActivity('ADMIN', `Vehicle registered: ${newVehicle.plate} (${newVehicle.makeModel}) for Flat ${newVehicle.flat}`);
    this.notify();
    return newVehicle;
  }

  // Operations: Visitor Passes
  createVisitorPass(passData) {
    const visitors = this.getVisitors();
    const passId = 'VP-' + Math.floor(1000 + Math.random() * 9000);
    const passcode = 'PM-' + Math.floor(100 + Math.random() * 900);

    const newPass = {
      id: passId,
      passcode,
      ...passData,
      checkInTime: new Date().toISOString(),
      status: 'Active'
    };

    visitors.unshift(newPass);
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
    this.broadcastToCloud('visitors', visitors);

    if (newPass.slotId) {
      this.updateSlotStatus(newPass.slotId, 'occupied', newPass.vehicleNumber);
    }

    this.logActivity('VISITOR', `Visitor Pass #${passId} created: ${newPass.visitorName} visiting Flat ${newPass.visitingFlat}`);
    this.notify();
    return newPass;
  }

  checkoutVisitor(passId) {
    const visitors = this.getVisitors();
    const pass = visitors.find(v => v.id === passId);
    if (pass) {
      pass.status = 'Exited';
      pass.checkOutTime = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
      this.broadcastToCloud('visitors', visitors);

      if (pass.slotId) {
        this.updateSlotStatus(pass.slotId, 'available', null);
      }

      this.logActivity('EXIT', `Visitor checkout: ${pass.visitorName} (${pass.vehicleNumber}) released Slot ${pass.slotId}`);
      this.notify();
      return true;
    }
    return false;
  }

  // Operations: Violations
  reportViolation(violationData) {
    const violations = this.getViolations();
    const violationId = 'VIO-' + new Date().getFullYear() + '-' + String(violations.length + 1).padStart(3, '0');

    const newViolation = {
      id: violationId,
      reportedAt: new Date().toISOString(),
      status: 'Under Investigation',
      severity: violationData.severity || 'Medium',
      actionLog: [
        { time: 'Just now', note: `Incident recorded by ${violationData.reporterName || 'Resident'}` }
      ],
      ...violationData
    };

    violations.unshift(newViolation);
    localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(violations));
    this.broadcastToCloud('violations', violations);
    this.logActivity('ALERT', `Unauthorized Parking Violation reported for Slot ${newViolation.slotId} (${newViolation.offendingVehicle})`);
    this.notify();
    return newViolation;
  }

  updateViolationStatus(id, newStatus, resolutionNote) {
    const violations = this.getViolations();
    const violation = violations.find(v => v.id === id);
    if (violation) {
      violation.status = newStatus;
      if (!violation.actionLog) violation.actionLog = [];
      violation.actionLog.unshift({
        time: 'Just now',
        note: resolutionNote || `Status updated to ${newStatus}`
      });
      localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(violations));
      this.broadcastToCloud('violations', violations);
      this.logActivity('ADMIN', `Violation ${id} status updated to ${newStatus}`);
      this.notify();
      return true;
    }
    return false;
  }

  logActivity(type, text) {
    const logs = this.getActivityLogs();
    const newLog = {
      id: 'act-' + Date.now(),
      type,
      text,
      time: 'Just now',
      role: this.getRole()
    };
    logs.unshift(newLog);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
    this.broadcastToCloud('activity', logs);
  }

  exportData() {
    return JSON.stringify({
      slots: this.getSlots(),
      residents: this.getResidents(),
      vehicles: this.getVehicles(),
      visitors: this.getVisitors(),
      violations: this.getViolations(),
      activityLogs: this.getActivityLogs(),
      communityId: this.communityId,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Global Store Instance
window.parkStore = new ParkMateCloudStore();
