# PARKMATE – Smart Residential Parking Management System

**A modern, responsive web application for residential apartment communities to organize parking bays, identify available slots in real time, manage registered vehicles, and resolve unauthorized parking.**

---

## 🌟 Executive Overview & Key Objectives

PARKMATE is designed for residential communities (gated condominiums, high-rise societies, and multi-tower estates) to tackle chaotic vehicle parking, unauthorized slot encroachment, guest pass mismanagement, and gate bottlenecks.

- **Theme & Aesthetic:** High-end enterprise dashboard featuring deep navy blue (`#0f172a`, `#1e3a8a`), crisp whites/light slates (`#ffffff`, `#f8fafc`), and vibrant emerald green status indicators (`#10b981`).
- **Responsive Layout:** Optimized for desktop command centers, security tablets, entrance gate LED boards, and mobile devices.
- **Local Persistence:** Powered by HTML5 `localStorage` for offline prototypes, instant state recall, and data export/import.
- **Hardware Integration Architecture:** Transparent separation between application business logic and IoT hardware. Includes an interactive test bench for ANPR optical gate cameras, ultrasonic bay sensors, and boom barrier relays.

---

## 👥 Supported User Roles

1. **Administrator (Estate Manager):**
   - Complete system overview and analytics.
   - Add, allocate, or reconfigure parking bays across levels (Basement 1, Basement 2, Ground).
   - Register residents and link multiple vehicles.
   - Review audit logs, incident tickets, and export system backups.
2. **Security Guard (Gate Control):**
   - Quick check-in/check-out for visitors with automatic bay assignment.
   - ANPR License Plate scanner test bench for automated boom barrier pulses.
   - Incident reporting for emergency zone or private slot encroachments.
3. **Resident (e.g. Dr. Vikram Malhotra, Flat A-101):**
   - View assigned private parking bays and registered family vehicles.
   - Self-service temporary guest parking pass creation.
   - One-click reporting when someone parks illegally in their allocated slot.

---

## 🚗 Core Modules & Features

### 1. Operations Dashboard
- Real-time KPIs: **Total Slots**, **Available Slots** (Green), **Occupied Slots** (Red), **Visitor & Reserved Bays** (Amber), and **EV Charging Bays** (Cyan).
- Dynamic floor breakdown bars for Basement 1 (Tower A & EV), Basement 2 (Tower B), and Ground Level (Visitor Hub).
- Live activity timeline tracking gate arrivals, pass generation, and administrative actions.

### 2. 2D Interactive Parking Lot Map & Layout
- Visual floor plan with driveway lane markings and realistic bay bays.
- Color-coded status indicators (Green = Available, Red = Occupied, Amber = Reserved, Cyan = EV).
- Click any bay to inspect details, reallocate to a flat, or change status.
- Add new parking bays with level, type (Car/Bike), and EV charger flags.

### 3. Entrance LED Digital Signage Screen (Gate Kiosk)
- High-contrast outdoor LED-style display engineered for gate entrance kiosks.
- Large glowing real-time numerical vacancy tallies (`TOTAL VACANT`, `VISITOR AVAILABLE`).
- Dynamic directional wayfinding indicators (`Level B1: Turn Right`, `Level B2: Ramp Down`, `Visitor: Straight`).
- Fullscreen kiosk toggle for dedicated touchscreens or monitor displays.

### 4. Resident Management Directory
- Unit/Flat number, resident full name, phone number, email, and tower wing.
- Direct links to allocated parking bays and registered vehicles count.
- Modal to register new resident profiles.

### 5. Vehicle Registry & Permits
- State registration plate number, make/model, color, vehicle type (Car/Bike/EV).
- Owner flat linkage and assigned slot association.
- Unique RFID windshield tag issuance (`RFID-XXXXX`).

### 6. Visitor Parking & Digital Pass Slips
- Dedicated visitor bay pool on Ground Floor.
- Visitor registration workflow with expected duration and mobile contact.
- One-click checkout that frees the parking bay back to green.
- **Printable Digital Visitor Parking Slip** with unique passcode (`PM-XXX`), barcode graphic, and validity timestamps.

### 7. Unauthorized Parking Incident Reports
- Report vehicles occupying wrong slots, blocking fire hydrants, or exceeding visitor limits.
- Status tracking: *Reported* &rarr; *Under Investigation* &rarr; *Notice Issued* &rarr; *Resolved*.
- Actions to dispatch wheel clamps, issue SMS notices, or mark violations resolved.

### 8. IoT & Hardware Simulator Bridge
- **Architectural Honesty:** This prototype explicitly clarifies that real cameras and sensors are not physically attached.
- **ANPR Camera Gateway Simulator:** Tests optical plate recognition against the database, triggering automatic barrier opening for authorized residents/guests.
- **Boom Barrier Visual Controller:** Visual animated barrier arm with 5-second automatic reset timer.
- **Ultrasonic Slot Sensor Telemetry:** Emulates MQTT messages (`sensors/bays/{slotId}`) to simulate vehicles entering or leaving bays.
- **Live Telemetry Diagnostic Terminal:** Displays raw JSON event frames in real time.

### 9. System Administration & Data Tools
- Backup state to JSON file (`parkmate-backup.json`).
- Restore or reset to initial default demo dataset at any time.
- Custom residential community name and gate configuration.

---

## 💻 Tech Stack

- **HTML5:** Semantic architecture, accessible forms, and print stylesheets.
- **CSS3:** Custom design tokens, responsive CSS Grid and Flexbox, animations, zero external framework overhead.
- **JavaScript (ES6+):** Pure vanilla JavaScript, Pub/Sub state store (`js/store.js`), Hardware Bridge (`js/hardware-sim.js`), UI Controller (`js/app.js`).
- **Typography:** Inter, Outfit, and JetBrains Mono via Google Fonts.

---

## 🚀 How to Run the Application

Since PARKMATE is built with standard web technologies:

1. Open `index.html` directly in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
2. Alternatively, serve via any lightweight static server:
   ```bash
   # Using Python 3:
   python -m http.server 8080

   # Or using Node npx:
   npx serve .
   ```
3. Navigate to `http://localhost:8080` in your browser.

---

*PARKMATE – Enterprise-grade Smart Residential Parking Management.*
