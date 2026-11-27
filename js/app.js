/**
 * PARKMATE - Smart Residential Parking Management System
 * Main Application Controller & UI View Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.parkStore;
  const hw = window.hardwareBridge;

  // State
  let currentTab = 'dashboard';
  let activeFloorFilter = 'ALL';
  let activeSearchTerm = '';
  let activeSelectedSlot = null;

  // DOM Elements - Navigation & Shell
  const sidebar = document.getElementById('appSidebar');
  const btnMobileToggle = document.getElementById('btnMobileToggle');
  const userRoleSelector = document.getElementById('userRoleSelector');
  const topbarPageTitle = document.getElementById('topbarPageTitle');
  const globalSearchInput = document.getElementById('globalSearchInput');
  const btnQuickReset = document.getElementById('btnQuickReset');
  const btnLaunchKiosk = document.getElementById('btnLaunchKiosk');

  // Sidebar Role Elements
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarRoleName = document.getElementById('sidebarRoleName');
  const sidebarRoleSub = document.getElementById('sidebarRoleSub');
  const sidebarAvailBadge = document.getElementById('sidebarAvailBadge');
  const sidebarVisitorBadge = document.getElementById('sidebarVisitorBadge');
  const sidebarViolationsBadge = document.getElementById('sidebarViolationsBadge');

  // Page View Titles Map
  const VIEW_TITLES = {
    dashboard: 'Operations Dashboard',
    map: '2D Parking Lot Map & Layout',
    kiosk: 'Entrance LED Signage Screen',
    residents: 'Resident Management Directory',
    vehicles: 'Vehicle Registry & Permits',
    visitors: 'Visitor Parking & Gate Passes',
    violations: 'Unauthorized Parking Reports',
    hardware: 'IoT Hardware Simulator & Architecture Bridge',
    settings: 'System Administration & Data Tools'
  };

  // =========================================================================
  // INITIALIZATION & TAB SWITCHING
  // =========================================================================
  function init() {
    // Role init
    const currentRole = store.getRole();
    if (userRoleSelector) userRoleSelector.value = currentRole;
    updateRoleUI(currentRole);

    // Subscribe to store updates
    store.subscribe(() => {
      renderAllViews();
    });

    // Subscribe to hardware updates
    hw.subscribe(() => {
      renderHardwareTelemetry();
      updateBarrierVisual();
    });

    // Start Kiosk Clock
    startKioskClock();

    // Render Initial State
    renderAllViews();
    renderHardwareTelemetry();
    bindEvents();
  }

  function switchTab(tabId) {
    if (!VIEW_TITLES[tabId]) return;
    currentTab = tabId;

    // Nav buttons
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Page Views
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Update Topbar
    if (topbarPageTitle) {
      topbarPageTitle.textContent = VIEW_TITLES[tabId];
    }

    // Close mobile drawer if open
    sidebar.classList.remove('mobile-open');

    // Tab-specific refreshes
    if (tabId === 'map') renderParkingMap();
    if (tabId === 'residents') renderResidents();
    if (tabId === 'vehicles') renderVehicles();
    if (tabId === 'visitors') renderVisitors();
    if (tabId === 'violations') renderViolations();
    if (tabId === 'kiosk') renderKioskView();
    if (tabId === 'hardware') populateHardwareDropdowns();
  }

  // =========================================================================
  // ROLE SWITCHING & PERMISSIONS
  // =========================================================================
  function updateRoleUI(role) {
    if (!sidebarAvatar || !sidebarRoleName || !sidebarRoleSub) return;
    if (role === 'admin') {
      sidebarAvatar.textContent = 'A';
      sidebarAvatar.style.color = 'var(--emerald-400)';
      sidebarRoleName.textContent = 'Estate Admin';
      sidebarRoleSub.textContent = 'Full Access Control';
    } else if (role === 'guard') {
      sidebarAvatar.textContent = 'G';
      sidebarAvatar.style.color = 'var(--blue-accent)';
      sidebarRoleName.textContent = 'Gate Security';
      sidebarRoleSub.textContent = 'North / South Gate';
    } else {
      sidebarAvatar.textContent = 'R';
      sidebarAvatar.style.color = 'var(--amber-400)';
      sidebarRoleName.textContent = 'Dr. V. Malhotra';
      sidebarRoleSub.textContent = 'Resident • Flat A-101';
    }
  }

  // =========================================================================
  // VIEW RENDERERS
  // =========================================================================
  function renderAllViews() {
    renderDashboard();
    renderParkingMap();
    renderResidents();
    renderVehicles();
    renderVisitors();
    renderViolations();
    renderKioskView();
    updateSidebarBadges();
  }

  function updateSidebarBadges() {
    const metrics = store.getDashboardMetrics();
    if (sidebarAvailBadge) sidebarAvailBadge.textContent = metrics.available;
    if (sidebarVisitorBadge) sidebarVisitorBadge.textContent = metrics.activeVisitorsCount;
    if (sidebarViolationsBadge) sidebarViolationsBadge.textContent = metrics.pendingViolationsCount;
  }

  // 1. Dashboard View
  function renderDashboard() {
    const metrics = store.getDashboardMetrics();
    const slots = store.getSlots();

    // Stats
    const elTotal = document.getElementById('dashTotalSlots');
    const elAvail = document.getElementById('dashAvailableSlots');
    const elOcc = document.getElementById('dashOccupiedSlots');
    const elVis = document.getElementById('dashVisitorSlots');
    const elEV = document.getElementById('dashEVSlots');
    const elAvailPercent = document.getElementById('dashAvailPercent');
    const elOccPercent = document.getElementById('dashOccPercent');
    const elActiveVisitorsPill = document.getElementById('dashActiveVisitorsPill');

    if (elTotal) elTotal.textContent = metrics.total;
    if (elAvail) elAvail.textContent = metrics.available;
    if (elOcc) elOcc.textContent = metrics.occupied;
    if (elVis) elVis.textContent = metrics.reserved;
    if (elEV) elEV.textContent = metrics.evSlots;
    if (elAvailPercent) elAvailPercent.textContent = `${Math.round((metrics.available / metrics.total) * 100)}% Vacant`;
    if (elOccPercent) elOccPercent.textContent = `${metrics.occupancyRate}% Occupied`;
    if (elActiveVisitorsPill) elActiveVisitorsPill.textContent = `${metrics.activeVisitorsCount} Active Guests`;

    // Floor breakdown
    const floorContainer = document.getElementById('dashFloorBarsContainer');
    if (floorContainer) {
      const floors = [
        { id: 'B1', name: 'Basement 1 (Tower A & EV)' },
        { id: 'B2', name: 'Basement 2 (Tower B)' },
        { id: 'G', name: 'Ground Level (Visitor Hub)' }
      ];

      floorContainer.innerHTML = floors.map(fl => {
        const floorSlots = slots.filter(s => s.level === fl.id);
        const total = floorSlots.length;
        const occ = floorSlots.filter(s => s.status === 'occupied').length;
        const avail = floorSlots.filter(s => s.status === 'available').length;
        const res = floorSlots.filter(s => s.status === 'reserved').length;
        const occPct = total ? Math.round((occ / total) * 100) : 0;
        const availPct = total ? Math.round((avail / total) * 100) : 0;
        const resPct = total ? Math.round((res / total) * 100) : 0;

        return `
          <div class="floor-bar-item">
            <div class="floor-meta">
              <span>${fl.name}</span>
              <span class="sub"><strong>${avail} Vacant</strong> / ${total} Total (${occPct}% Occupied)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill red" style="width: ${occPct}%;" title="Occupied: ${occ}"></div>
              <div class="progress-fill amber" style="width: ${resPct}%;" title="Reserved: ${res}"></div>
              <div class="progress-fill green" style="width: ${availPct}%;" title="Available: ${avail}"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Activity Feed
    const activityContainer = document.getElementById('dashActivityFeed');
    if (activityContainer) {
      const logs = store.getActivityLogs().slice(0, 6);
      activityContainer.innerHTML = logs.map(item => {
        const badgeClass = item.type.toLowerCase();
        return `
          <div class="activity-item">
            <div class="act-badge ${badgeClass}">${item.type[0]}</div>
            <div class="act-content">
              <div class="act-text">${escapeHtml(item.text)}</div>
              <div class="act-meta">
                <span>${item.time}</span>
                <span>•</span>
                <span>By ${item.role || 'System'}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. 2D Interactive Parking Map View
  function renderParkingMap() {
    const grid = document.getElementById('slotsGridContainer');
    if (!grid) return;

    let slots = store.getSlots();

    // Floor filter
    if (activeFloorFilter !== 'ALL') {
      slots = slots.filter(s => s.level === activeFloorFilter);
    }

    // Counts in legend
    const allSlots = store.getSlots();
    const countAvail = document.getElementById('mapCountAvail');
    const countOcc = document.getElementById('mapCountOcc');
    const countRes = document.getElementById('mapCountRes');
    if (countAvail) countAvail.textContent = allSlots.filter(s => s.status === 'available').length;
    if (countOcc) countOcc.textContent = allSlots.filter(s => s.status === 'occupied').length;
    if (countRes) countRes.textContent = allSlots.filter(s => s.status === 'reserved').length;

    // Render Slots
    grid.innerHTML = slots.map(slot => {
      const isCar = slot.type === 'car';
      const isBike = slot.type === 'bike';
      const hasEV = slot.isEV;

      let vehicleSvg = isCar
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="2"></rect><circle cx="6" cy="19" r="2"></circle><circle cx="18" cy="19" r="2"></circle></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="17" r="3"></circle><circle cx="19" cy="17" r="3"></circle><path d="M9 17h6l2-8h-4l-2 5"></path></svg>`;

      return `
        <div class="parking-slot-bay ${slot.status}" data-slot-id="${slot.id}">
          <div class="slot-top-row">
            <span class="slot-code">${slot.id}</span>
            <div style="display: flex; gap: 4px;">
              ${hasEV ? `<span class="slot-badge-type ev" title="EV Fast Charger">EV</span>` : ''}
              ${isBike ? `<span class="slot-badge-type bike">2W</span>` : ''}
              ${slot.level === 'G' ? `<span class="slot-badge-type visitor">VISIT</span>` : ''}
            </div>
          </div>
          <div class="slot-center-graphic">
            <div class="slot-vehicle-icon">
              ${vehicleSvg}
            </div>
            ${slot.assignedVehicle ? `<div class="slot-plate-tag">${escapeHtml(slot.assignedVehicle)}</div>` : ''}
          </div>
          <div class="slot-bottom-meta">
            <span class="slot-flat-label">${slot.allocatedFlat || 'Unassigned'}</span>
            <span class="slot-state-text">${slot.status}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers to slots
    grid.querySelectorAll('.parking-slot-bay').forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        const slotId = slotEl.getAttribute('data-slot-id');
        openSlotDetailModal(slotId);
      });
    });
  }

  // 3. Entrance Signage Kiosk View
  function renderKioskView() {
    const metrics = store.getDashboardMetrics();
    const slots = store.getSlots();
    const elTotalAvail = document.getElementById('kioskTotalAvailable');
    const elVisAvail = document.getElementById('kioskVisitorAvailable');
    const elOcc = document.getElementById('kioskTotalOccupied');

    if (elTotalAvail) elTotalAvail.textContent = metrics.available;
    if (elVisAvail) elVisAvail.textContent = metrics.visitorAvailable;
    if (elOcc) elOcc.textContent = metrics.occupied;

    // Wayfinding counts
    const b1Avail = slots.filter(s => s.level === 'B1' && s.status === 'available').length;
    const b2Avail = slots.filter(s => s.level === 'B2' && s.status === 'available').length;
    const gAvail = slots.filter(s => s.level === 'G' && s.status === 'available').length;

    const elB1 = document.getElementById('kioskB1Avail');
    const elB2 = document.getElementById('kioskB2Avail');
    const elG = document.getElementById('kioskGAvail');

    if (elB1) elB1.textContent = b1Avail;
    if (elB2) elB2.textContent = b2Avail;
    if (elG) elG.textContent = gAvail;

    // Wayfind cards classes
    const cardB1 = document.getElementById('kioskWayfindB1');
    const cardB2 = document.getElementById('kioskWayfindB2');
    const cardG = document.getElementById('kioskWayfindG');

    if (cardB1) cardB1.classList.toggle('full', b1Avail === 0);
    if (cardB2) cardB2.classList.toggle('full', b2Avail === 0);
    if (cardG) cardG.classList.toggle('full', gAvail === 0);
  }

  function startKioskClock() {
    function tick() {
      const clockEl = document.getElementById('kioskClockDisplay');
      const dateEl = document.getElementById('kioskDateDisplay');
      const now = new Date();

      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // 4. Residents Directory
  function renderResidents() {
    const tbody = document.getElementById('residentsTableBody');
    const countBadge = document.getElementById('residentCountBadge');
    if (!tbody) return;

    let residents = store.getResidents();
    const vehicles = store.getVehicles();
    const slots = store.getSlots();

    // Filter
    if (activeSearchTerm) {
      const q = activeSearchTerm.toLowerCase();
      residents = residents.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.flat.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }

    if (countBadge) {
      countBadge.textContent = `${residents.length} Registered Residents`;
    }

    if (residents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--navy-500);">No residents found matching your query.</td></tr>`;
      return;
    }

    tbody.innerHTML = residents.map(res => {
      const resVehicles = vehicles.filter(v => v.flat === res.flat);
      const resSlots = slots.filter(s => s.allocatedFlat === res.flat).map(s => s.id);

      return `
        <tr>
          <td><strong style="color: var(--blue-accent); font-size: 14px;">${escapeHtml(res.flat)}</strong></td>
          <td>
            <strong>${escapeHtml(res.name)}</strong>
          </td>
          <td>
            <div>${escapeHtml(res.phone)}</div>
            <div style="font-size: 11.5px; color: var(--navy-500);">${escapeHtml(res.email || '—')}</div>
          </td>
          <td><span class="badge info">${escapeHtml(res.wing)}</span></td>
          <td>
            ${resVehicles.length > 0
              ? resVehicles.map(v => `<span class="plate-pill" style="margin-right: 4px;">${v.plate}</span>`).join('')
              : '<span style="color: var(--navy-500);">None</span>'
            }
          </td>
          <td>
            ${resSlots.length > 0
              ? resSlots.map(s => `<span class="badge active" style="margin-right: 4px;">${s}</span>`).join('')
              : '<span style="color: var(--navy-500);">None</span>'
            }
          </td>
          <td>
            <button class="btn btn-outline btn-sm btn-quick-guest" data-flat="${res.flat}" title="Create Visitor Pass for Flat">
              + Guest Pass
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach quick guest pass handler
    tbody.querySelectorAll('.btn-quick-guest').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const flat = e.target.getAttribute('data-flat');
        openVisitorModalWithFlat(flat);
      });
    });
  }

  // 5. Vehicles Registry
  function renderVehicles() {
    const tbody = document.getElementById('vehiclesTableBody');
    const countBadge = document.getElementById('vehicleCountBadge');
    if (!tbody) return;

    let vehicles = store.getVehicles();

    if (activeSearchTerm) {
      const q = activeSearchTerm.toLowerCase();
      vehicles = vehicles.filter(v =>
        v.plate.toLowerCase().includes(q) ||
        v.flat.toLowerCase().includes(q) ||
        (v.rfidTag && v.rfidTag.toLowerCase().includes(q)) ||
        v.makeModel.toLowerCase().includes(q)
      );
    }

    if (countBadge) countBadge.textContent = `${vehicles.length} Registered Vehicles`;

    if (vehicles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--navy-500);">No vehicles found matching query.</td></tr>`;
      return;
    }

    tbody.innerHTML = vehicles.map(veh => {
      const isEV = veh.isEV;
      return `
        <tr>
          <td><span class="plate-pill">${escapeHtml(veh.plate)}</span></td>
          <td>
            <strong>${escapeHtml(veh.makeModel)}</strong>
            <div style="font-size: 11.5px; color: var(--navy-500);">${escapeHtml(veh.color || '')}</div>
          </td>
          <td>
            ${isEV ? `<span class="badge ev">EV</span>` : ''}
            <span class="badge info">${veh.type === 'car' ? 'Car' : '2-Wheeler'}</span>
          </td>
          <td>
            <strong>Flat ${escapeHtml(veh.flat)}</strong>
            <div style="font-size: 11.5px; color: var(--navy-500);">${escapeHtml(veh.residentName || '')}</div>
          </td>
          <td>
            ${veh.slotId ? `<span class="badge active">${veh.slotId}</span>` : '<span style="color: var(--navy-500);">Floating</span>'}
          </td>
          <td><code style="font-size: 11.5px;">${escapeHtml(veh.rfidTag || '—')}</code></td>
          <td><span class="badge active">${veh.stickerStatus || 'Active'}</span></td>
          <td>
            <button class="btn btn-outline btn-sm btn-test-gate" data-plate="${veh.plate}">
              Test Gate
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-test-gate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plate = e.currentTarget.getAttribute('data-plate');
        switchTab('hardware');
        const customGroup = document.getElementById('simCustomPlateGroup');
        const selector = document.getElementById('simPlateSelector');
        if (selector) {
          selector.value = 'CUSTOM';
          if (customGroup) customGroup.style.display = 'block';
          const customInput = document.getElementById('simCustomPlateInput');
          if (customInput) customInput.value = plate;
        }
        triggerANPRGateScan(plate);
      });
    });
  }

  // 6. Visitor Parking
  function renderVisitors() {
    const tbody = document.getElementById('visitorsTableBody');
    const countBadge = document.getElementById('visitorCountBadge');
    if (!tbody) return;

    let visitors = store.getVisitors();

    if (activeSearchTerm) {
      const q = activeSearchTerm.toLowerCase();
      visitors = visitors.filter(v =>
        v.visitorName.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.visitingFlat.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
      );
    }

    if (countBadge) {
      const activeCount = visitors.filter(v => v.status === 'Active').length;
      countBadge.textContent = `${activeCount} Active Passes (${visitors.length} Total Logs)`;
    }

    if (visitors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--navy-500);">No visitor records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = visitors.map(vis => {
      const isActive = vis.status === 'Active';
      const checkInFormatted = new Date(vis.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <tr>
          <td><strong style="color: var(--blue-accent); font-family: var(--font-mono);">${vis.id}</strong></td>
          <td>
            <strong>${escapeHtml(vis.visitorName)}</strong>
            <div style="font-size: 11.5px; color: var(--navy-500);">${escapeHtml(vis.visitorPhone || '')}</div>
          </td>
          <td><span class="plate-pill">${escapeHtml(vis.vehicleNumber)}</span></td>
          <td><strong>Flat ${escapeHtml(vis.visitingFlat)}</strong></td>
          <td><span class="badge ${isActive ? 'active' : 'info'}">${vis.slotId || 'G-01'}</span></td>
          <td>${checkInFormatted}</td>
          <td>
            <span class="badge ${isActive ? 'active' : 'reserved'}">${vis.status}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm btn-print-pass" data-id="${vis.id}">Slip</button>
              ${isActive ? `<button class="btn btn-danger btn-sm btn-checkout-visitor" data-id="${vis.id}">Exit</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach actions
    tbody.querySelectorAll('.btn-print-pass').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const passId = e.currentTarget.getAttribute('data-id');
        openVisitorSlipModal(passId);
      });
    });

    tbody.querySelectorAll('.btn-checkout-visitor').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const passId = e.currentTarget.getAttribute('data-id');
        if (confirm(`Check out visitor pass #${passId} and release assigned bay?`)) {
          store.checkoutVisitor(passId);
          showToast(`Visitor checked out successfully. Parking bay released.`, 'success');
        }
      });
    });
  }

  // 7. Violations Management
  function renderViolations() {
    const tbody = document.getElementById('violationsTableBody');
    const countBadge = document.getElementById('violationCountBadge');
    if (!tbody) return;

    let violations = store.getViolations();

    if (activeSearchTerm) {
      const q = activeSearchTerm.toLowerCase();
      violations = violations.filter(vio =>
        vio.slotId.toLowerCase().includes(q) ||
        vio.offendingVehicle.toLowerCase().includes(q) ||
        vio.violationType.toLowerCase().includes(q) ||
        vio.id.toLowerCase().includes(q)
      );
    }

    if (countBadge) {
      const activeCount = violations.filter(v => v.status !== 'Resolved').length;
      countBadge.textContent = `${activeCount} Pending Incidents (${violations.length} Total)`;
    }

    if (violations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--navy-500);">No unauthorized parking violations reported.</td></tr>`;
      return;
    }

    tbody.innerHTML = violations.map(vio => {const isResolved = vio.status === 'Resolved';
      let sevBadge = 'badge info';
      if (vio.severity === 'Critical') sevBadge = 'badge critical';
      if (vio.severity === 'High') sevBadge = 'badge danger';

      const reportedDate = new Date(vio.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <tr>
          <td><strong style="color: var(--rose-600); font-family: var(--font-mono);">${vio.id}</strong></td>
          <td><span class="badge active" style="font-weight: 700;">${vio.slotId}</span></td>
          <td>
            <span class="plate-pill">${escapeHtml(vio.offendingVehicle)}</span>
            <div style="font-size: 11.5px; color: var(--navy-500); margin-top: 2px;">${escapeHtml(vio.vehicleDescription || '')}</div>
          </td>
          <td>
            <strong>${escapeHtml(vio.violationType)}</strong>
            <span class="${sevBadge}" style="margin-left: 6px;">${vio.severity || 'Medium'}</span>
          </td>
          <td>${escapeHtml(vio.reporterName || vio.reportedByRole)}</td>
          <td>
            <span class="badge ${isResolved ? 'active' : 'occupied'}">${vio.status}</span>
          </td>
          <td>${reportedDate}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${!isResolved ? `
                <button class="btn btn-outline btn-sm btn-issue-notice" data-id="${vio.id}">Notice</button>
                <button class="btn btn-success btn-sm btn-resolve-vio" data-id="${vio.id}">Resolve</button>
              ` : `<span style="color: var(--emerald-600); font-size: 12px; font-weight: 600;">Closed</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach actions
    tbody.querySelectorAll('.btn-issue-notice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vioId = e.currentTarget.getAttribute('data-id');
        store.updateViolationStatus(vioId, 'Notice Issued', 'Physical violation slip & SMS sent to vehicle owner.');
        showToast(`Violation Notice recorded for ${vioId}. SMS dispatch simulated.`, 'warning');
      });
    });

    tbody.querySelectorAll('.btn-resolve-vio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vioId = e.currentTarget.getAttribute('data-id');
        store.updateViolationStatus(vioId, 'Resolved', 'Vehicle vacated slot. Incident closed by Security.');
        showToast(`Incident ${vioId} marked as Resolved.`, 'success');
      });
    });
  }

  // 8. Hardware & IoT Telemetry
  function renderHardwareTelemetry() {
    const consoleEl = document.getElementById('telemetryConsole');
    if (!consoleEl) return;

    const logs = hw.getTelemetryLogs();
    consoleEl.innerHTML = logs.map(line => `
      <div class="telemetry-line">
        <span class="time">[${line.time}]</span>
        <span class="proto">${line.protocol}</span>
        <span class="topic">${line.topic}:</span>
        <span class="payload">${escapeHtml(line.payload)}</span>
      </div>
    `).join('');
  }

  function updateBarrierVisual() {
    const state = hw.getBarrierState('North Gate');
    const arm = document.getElementById('barrierArmVisual');
    const light = document.getElementById('barrierIndicatorLight');

    if (arm) {
      if (state === 'OPEN') arm.classList.add('open');
      else arm.classList.remove('open');
    }

    if (light) {
      if (state === 'OPEN') {
        light.textContent = 'GATE OPEN (AUTHORIZED)';
        light.className = 'barrier-indicator-light open';
      } else {
        light.textContent = 'GATE CLOSED';
        light.className = 'barrier-indicator-light closed';
      }
    }
  }

  function populateHardwareDropdowns() {
    const slotSelect = document.getElementById('simSlotSelect');
    if (!slotSelect) return;
    const slots = store.getSlots();
    slotSelect.innerHTML = slots.map(s => `
      <option value="${s.id}">${s.id} (${s.level} - Current: ${s.status})</option>
    `).join('');
  }

  function triggerANPRGateScan(plateToScan) {
    const resultBox = document.getElementById('simScanResultBox');
    if (!resultBox) return;

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="padding: 12px; background: var(--navy-100); border-radius: var(--radius-md); font-size: 13px; display: flex; align-items: center; gap: 8px;">
        <span class="status-dot"></span> Processing optical OCR on license plate <strong>${escapeHtml(plateToScan)}</strong>...
      </div>
    `;

    setTimeout(() => {
      const res = hw.simulateLicensePlateCapture(plateToScan, 'North Gate');
      if (res.success) {
        resultBox.innerHTML = `
          <div style="padding: 14px; background: var(--emerald-50); border: 1px solid var(--emerald-500); border-radius: var(--radius-md); color: var(--navy-900);">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--emerald-600); margin-bottom: 4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              ACCESS GRANTED • BARRIER OPENED
            </div>
            <div style="font-size: 13px;">${escapeHtml(res.message)}</div>
          </div>
        `;
        showToast(`Plate ${plateToScan} verified. Gate barrier activated.`, 'success');
      } else {
        resultBox.innerHTML = `
          <div style="padding: 14px; background: var(--rose-50); border: 1px solid var(--rose-500); border-radius: var(--radius-md); color: var(--navy-900);">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--rose-600); margin-bottom: 4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              ACCESS DENIED • UNREGISTERED VEHICLE
            </div>
            <div style="font-size: 13px; margin-bottom: 10px;">${escapeHtml(res.message)}</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" id="btnQuickVisitorFromANPR">Issue Visitor Pass</button>
              <button class="btn btn-danger btn-sm" id="btnQuickReportFromANPR">Flag Security Violation</button>
            </div>
          </div>
        `;

        document.getElementById('btnQuickVisitorFromANPR')?.addEventListener('click', () => {
          openVisitorModalWithPlate(plateToScan);
        });

        document.getElementById('btnQuickReportFromANPR')?.addEventListener('click', () => {
          openViolationModalWithPlate(plateToScan);
        });

        showToast(`Plate ${plateToScan} not recognized! Guard alert dispatched.`, 'warning');
      }
    }, 400);
  }

  // =========================================================================
  // MODAL LOGIC & FORM HANDLERS
  // =========================================================================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }

  // Slot Detail Modal
  function openSlotDetailModal(slotId) {
    const slot = store.getSlots().find(s => s.id === slotId);
    if (!slot) return;
    activeSelectedSlot = slot;

    const titleEl = document.getElementById('slotModalTitle');
    const statusSelect = document.getElementById('slotDetailStatus');
    const flatInput = document.getElementById('slotDetailFlat');
    const vehicleInput = document.getElementById('slotDetailVehicle');
    const evCheck = document.getElementById('slotDetailEV');

    if (titleEl) titleEl.textContent = `Manage Parking Bay ${slot.id} (${slot.level})`;
    if (statusSelect) statusSelect.value = slot.status;
    if (flatInput) flatInput.value = slot.allocatedFlat || '';
    if (vehicleInput) vehicleInput.value = slot.assignedVehicle || '';
    if (evCheck) evCheck.checked = Boolean(slot.isEV);

    openModal('modalSlotDetails');
  }

  // Visitor Pass Slip Modal
  function openVisitorSlipModal(passId) {
    const pass = store.getVisitors().find(v => v.id === passId);
    if (!pass) return;

    const passcodeEl = document.getElementById('slipPasscode');
    const nameEl = document.getElementById('slipVisitorName');
    const plateEl = document.getElementById('slipVehiclePlate');
    const flatEl = document.getElementById('slipVisitingFlat');
    const bayEl = document.getElementById('slipBayId');
    const inEl = document.getElementById('slipCheckIn');
    const validEl = document.getElementById('slipValidUntil');

    if (passcodeEl) passcodeEl.textContent = pass.passcode || 'PM-880';
    if (nameEl) nameEl.textContent = pass.visitorName;
    if (plateEl) plateEl.textContent = pass.vehicleNumber;
    if (flatEl) flatEl.textContent = `Flat ${pass.visitingFlat}`;
    if (bayEl) bayEl.textContent = pass.slotId || 'G-01';
    if (inEl) inEl.textContent = new Date(pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (validEl) validEl.textContent = `${pass.expectedDurationHours || 2} Hours Duration`;

    openModal('modalVisitorSlip');
  }

  function openVisitorModalWithFlat(flatNumber) {
    populateVisitorFormDropdowns();
    const flatSelect = document.getElementById('visFlat');
    if (flatSelect) flatSelect.value = flatNumber;
    openModal('modalCreateVisitor');
  }

  function openVisitorModalWithPlate(plateNumber) {
    populateVisitorFormDropdowns();
    const plateInput = document.getElementById('visPlate');
    if (plateInput) plateInput.value = plateNumber;
    openModal('modalCreateVisitor');
  }

  function openViolationModalWithPlate(plateNumber) {
    populateViolationFormDropdowns();
    const plateInput = document.getElementById('vioOffendingPlate');
    if (plateInput) plateInput.value = plateNumber;
    openModal('modalReportViolation');
  }

  function populateVisitorFormDropdowns() {
    const residents = store.getResidents();
    const slots = store.getSlots();
    const flatSelect = document.getElementById('visFlat');
    const slotSelect = document.getElementById('visSlot');

    if (flatSelect) {
      flatSelect.innerHTML = residents.map(r => `
        <option value="${r.flat}">Flat ${r.flat} (${r.name})</option>
      `).join('');
    }

    if (slotSelect) {
      const visitorSlots = slots.filter(s => s.level === 'G');
      slotSelect.innerHTML = visitorSlots.map(s => `
        <option value="${s.id}">${s.id} (Ground Visitor Bay - Current: ${s.status})</option>
      `).join('');
    }
  }

  function populateVehicleFormDropdowns() {
    const residents = store.getResidents();
    const slots = store.getSlots();
    const flatSelect = document.getElementById('vehFlat');
    const slotSelect = document.getElementById('vehSlot');

    if (flatSelect) {
      flatSelect.innerHTML = residents.map(r => `
        <option value="${r.flat}">Flat ${r.flat} - ${r.name}</option>
      `).join('');
    }

    if (slotSelect) {
      slotSelect.innerHTML = `
        <option value="">-- No Dedicated Bay (Floating) --</option>
        ${slots.map(s => `
          <option value="${s.id}">${s.id} (${s.level}) - ${s.allocatedFlat ? `Assigned to ${s.allocatedFlat}` : 'Available'}</option>
        `).join('')}
      `;
    }
  }

  function populateViolationFormDropdowns() {
    const slots = store.getSlots();
    const slotSelect = document.getElementById('vioSlot');
    if (slotSelect) {
      slotSelect.innerHTML = slots.map(s => `
        <option value="${s.id}">${s.id} (${s.allocatedFlat ? `Flat ${s.allocatedFlat}` : 'General Bay'})</option>
      `).join('');
    }
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    if (type === 'success') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error' || type === 'danger') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }

    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Utility: HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }// =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  function bindEvents() {
    // Mobile Drawer Toggle
    if (btnMobileToggle) {
      btnMobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Role Switcher
    if (userRoleSelector) {
      userRoleSelector.addEventListener('change', (e) => {
        const newRole = e.target.value;
        store.setRole(newRole);
        updateRoleUI(newRole);
        showToast(`Role switched to: ${newRole.toUpperCase()}`, 'info');
      });
    }

    // Sidebar Nav Item Clicks
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Quick Kiosk Launcher
    if (btnLaunchKiosk) {
      btnLaunchKiosk.addEventListener('click', () => switchTab('kiosk'));
    }

    // Dashboard Quick Buttons
    document.getElementById('btnDashQuickPass')?.addEventListener('click', () => {
      populateVisitorFormDropdowns();
      openModal('modalCreateVisitor');
    });

    document.getElementById('btnDashReportVio')?.addEventListener('click', () => {
      populateViolationFormDropdowns();
      openModal('modalReportViolation');
    });

    document.getElementById('btnDashViewFullMap')?.addEventListener('click', () => switchTab('map'));

    // Global Search
    if (globalSearchInput) {
      globalSearchInput.addEventListener('input', (e) => {
        activeSearchTerm = e.target.value.trim();
        renderResidents();
        renderVehicles();
        renderVisitors();
        renderViolations();
      });
    }

    // Reset Demo Data
    if (btnQuickReset) {
      btnQuickReset.addEventListener('click', () => {
        if (confirm('Reset system data to initial realistic demo state?')) {
          store.resetToDefaults();
          showToast('System reset to default demo dataset.', 'success');
        }
      });
    }

    // Floor Filters in Map
    const floorFilterContainer = document.getElementById('mapFloorFilters');
    if (floorFilterContainer) {
      floorFilterContainer.querySelectorAll('.floor-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          floorFilterContainer.querySelectorAll('.floor-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFloorFilter = btn.getAttribute('data-floor');
          renderParkingMap();
        });
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAllModals();
      });
    });

    // Save Slot Changes Modal
    document.getElementById('btnSaveSlotChanges')?.addEventListener('click', () => {
      if (!activeSelectedSlot) return;
      const newStatus = document.getElementById('slotDetailStatus').value;
      const newFlat = document.getElementById('slotDetailFlat').value.trim();
      const newVehicle = document.getElementById('slotDetailVehicle').value.trim();
      const newEV = document.getElementById('slotDetailEV').checked;

      const slots = store.getSlots();
      const slot = slots.find(s => s.id === activeSelectedSlot.id);
      if (slot) {
        slot.status = newStatus;
        slot.allocatedFlat = newFlat || null;
        slot.assignedVehicle = newVehicle || null;
        slot.isEV = newEV;
        slot.lastUpdated = 'Just now';
        localStorage.setItem('parkmate_slots_v2', JSON.stringify(slots));
        store.logActivity('ADMIN', `Slot ${slot.id} reconfigured (${newStatus}, Flat: ${newFlat || 'None'})`);
        store.notify();
        closeAllModals();
        showToast(`Slot ${slot.id} updated successfully.`, 'success');
      }
    });

    // Add Slot Modal Open & Submit
    document.getElementById('btnAddSlotModalBtn')?.addEventListener('click', () => {
      openModal('modalAddSlot');
    });

    document.getElementById('btnSubmitNewSlot')?.addEventListener('click', () => {
      const id = document.getElementById('newSlotId').value.trim().toUpperCase();
      const level = document.getElementById('newSlotLevel').value;
      const type = document.getElementById('newSlotType').value;
      const flat = document.getElementById('newSlotFlat').value.trim();
      const isEV = document.getElementById('newSlotIsEV').checked;

      if (!id) {
        showToast('Please enter a slot number (e.g. B1-11)', 'error');
        return;
      }

      try {
        store.addSlot({
          id,
          level,
          zone: level === 'B1' ? 'Tower A' : (level === 'B2' ? 'Tower B' : 'Visitor Hub'),
          type,
          isEV,
          status: 'available',
          allocatedFlat: flat || null,
          assignedVehicle: null
        });
        closeAllModals();
        document.getElementById('addSlotForm').reset();
        showToast(`Parking bay ${id} created.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Add Resident Modal Open & Submit
    document.getElementById('btnAddResidentModalBtn')?.addEventListener('click', () => {
      openModal('modalAddResident');
    });

    document.getElementById('btnSubmitNewResident')?.addEventListener('click', () => {
      const flat = document.getElementById('resFlat').value.trim().toUpperCase();
      const wing = document.getElementById('resWing').value;
      const name = document.getElementById('resName').value.trim();
      const phone = document.getElementById('resPhone').value.trim();
      const email = document.getElementById('resEmail').value.trim();

      if (!flat || !name || !phone) {
        showToast('Please provide Flat, Name, and Phone.', 'error');
        return;
      }

      store.addResident({ flat, wing, name, phone, email });
      closeAllModals();
      document.getElementById('addResidentForm').reset();
      showToast(`Resident ${name} registered for Flat ${flat}.`, 'success');
    });

    // Add Vehicle Modal Open & Submit
    document.getElementById('btnAddVehicleModalBtn')?.addEventListener('click', () => {
      populateVehicleFormDropdowns();
      openModal('modalAddVehicle');
    });

    document.getElementById('btnSubmitNewVehicle')?.addEventListener('click', () => {
      const plate = document.getElementById('vehPlate').value.trim();
      const type = document.getElementById('vehType').value;
      const isEV = document.getElementById('vehIsEV').value === 'true';
      const makeModel = document.getElementById('vehMake').value.trim();
      const flat = document.getElementById('vehFlat').value;
      const slotId = document.getElementById('vehSlot').value || null;

      if (!plate || !makeModel || !flat) {
        showToast('Please fill in plate number, make/model, and flat.', 'error');
        return;
      }

      const resident = store.getResidents().find(r => r.flat === flat);

      try {
        store.addVehicle({
          plate,
          type,
          isEV,
          makeModel,
          flat,
          slotId,
          residentName: resident ? resident.name : `Resident ${flat}`,
          color: 'Standard'
        });
        closeAllModals();
        document.getElementById('addVehicleForm').reset();
        showToast(`Vehicle ${plate} registered to Flat ${flat}.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Visitor Pass Modal Open & Submit
    document.getElementById('btnCreateVisitorPassModal')?.addEventListener('click', () => {
      populateVisitorFormDropdowns();
      openModal('modalCreateVisitor');
    });

    document.getElementById('btnSubmitVisitorPass')?.addEventListener('click', () => {
      const visitorName = document.getElementById('visName').value.trim();
      const visitorPhone = document.getElementById('visPhone').value.trim();
      const vehicleNumber = document.getElementById('visPlate').value.trim().toUpperCase();
      const vehicleType = document.getElementById('visType').value;
      const visitingFlat = document.getElementById('visFlat').value;
      const slotId = document.getElementById('visSlot').value;
      const expectedDurationHours = parseInt(document.getElementById('visDuration').value, 10) || 2;

      if (!visitorName || !vehicleNumber || !visitingFlat) {
        showToast('Please fill in Visitor Name, Vehicle Plate, and Flat.', 'error');
        return;
      }

      const pass = store.createVisitorPass({
        visitorName,
        visitorPhone,
        vehicleNumber,
        vehicleType,
        visitingFlat,
        slotId,
        expectedDurationHours
      });

      closeAllModals();
      document.getElementById('visitorPassForm').reset();
      showToast(`Visitor pass #${pass.id} generated. Passcode: ${pass.passcode}`, 'success');

      // Open print slip preview
      openVisitorSlipModal(pass.id);
    });

    // Violation Modal Open & Submit
    document.getElementById('btnReportViolationModal')?.addEventListener('click', () => {
      populateViolationFormDropdowns();
      openModal('modalReportViolation');
    });

    document.getElementById('btnSubmitViolation')?.addEventListener('click', () => {
      const slotId = document.getElementById('vioSlot').value;
      const offendingVehicle = document.getElementById('vioOffendingPlate').value.trim().toUpperCase();
      const violationType = document.getElementById('vioType').value;
      const description = document.getElementById('vioDesc').value.trim();
      const severity = document.getElementById('vioSeverity').value;

      if (!slotId || !offendingVehicle || !description) {
        showToast('Please specify the slot, vehicle plate, and description.', 'error');
        return;
      }

      const slots = store.getSlots();
      const slot = slots.find(s => s.id === slotId);store.reportViolation({
        slotId,
        offendingVehicle,
        vehicleDescription: 'Reported Vehicle',
        allocatedResidentFlat: slot ? (slot.allocatedFlat || 'Unassigned') : 'General',
        reportedByRole: store.getRole(),
        reporterName: store.getRole() === 'resident' ? 'Dr. Vikram Malhotra (A-101)' : 'Duty Guard',
        violationType,
        description,
        severity
      });

      closeAllModals();
      document.getElementById('reportViolationForm').reset();
      showToast(`Violation reported on Slot ${slotId}. Guard unit alerted.`, 'warning');
    });

    // Hardware Simulation: ANPR Plate Selector
    const simPlateSelector = document.getElementById('simPlateSelector');
    const simCustomGroup = document.getElementById('simCustomPlateGroup');
    const simCustomInput = document.getElementById('simCustomPlateInput');
    const btnSimScan = document.getElementById('btnSimulateScanPlate');

    if (simPlateSelector && simCustomGroup) {
      simPlateSelector.addEventListener('change', (e) => {
        if (e.target.value === 'CUSTOM') {
          simCustomGroup.style.display = 'block';
        } else {
          simCustomGroup.style.display = 'none';
        }
      });
    }

    if (btnSimScan) {
      btnSimScan.addEventListener('click', () => {
        let plate = simPlateSelector.value;
        if (plate === 'CUSTOM') {
          plate = simCustomInput.value.trim().toUpperCase();
        }
        if (!plate) {
          showToast('Please choose or enter a plate number.', 'error');
          return;
        }
        triggerANPRGateScan(plate);
      });
    }

    // Barrier Control Buttons
    document.getElementById('btnBarrierOpen')?.addEventListener('click', () => {
      hw.triggerBarrierRelay('North Gate', 'OPEN', 5000);
      showToast('Relay command pulse sent: Barrier OPEN (5s timer)', 'info');
    });

    document.getElementById('btnBarrierClose')?.addEventListener('click', () => {
      hw.triggerBarrierRelay('North Gate', 'FORCE_CLOSE', 0);
      showToast('Relay command sent: Force CLOSED', 'warning');
    });

    // Ultrasonic Bay Sensor Trigger
    document.getElementById('btnSimulateSensorTrigger')?.addEventListener('click', () => {
      const slotSelect = document.getElementById('simSlotSelect');
      const stateSelect = document.getElementById('simSlotStateSelect');
      if (!slotSelect || !stateSelect) return;

      const slotId = slotSelect.value;
      const newState = stateSelect.value;

      hw.simulateBaySensorTelemetry(slotId, newState);
      showToast(`Sensor MQTT trigger: Bay ${slotId} state is now ${newState.toUpperCase()}`, 'success');
    });

    // Toggle Kiosk Fullscreen
    document.getElementById('btnToggleKioskFullscreen')?.addEventListener('click', () => {
      const container = document.getElementById('kioskContainerElement');
      if (!container) return;

      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    // Export Database
    document.getElementById('btnExportJSON')?.addEventListener('click', () => {
      const json = store.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parkmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database exported as JSON.', 'success');
    });

    // Reset All Data
    document.getElementById('btnResetAllData')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data back to factory demo defaults?')) {
        store.resetToDefaults();
        showToast('System data reset to initial defaults.', 'success');
      }
    });

    // Save Community Configuration
    document.getElementById('btnSaveConfig')?.addEventListener('click', () => {
      const name = document.getElementById('cfgCommunityName').value.trim();
      const displayEl = document.getElementById('communityNameDisplay');
      const kioskSub = document.getElementById('kioskCommunitySubtitle');
      if (name && displayEl) {
        displayEl.textContent = name;
        if (kioskSub) kioskSub.textContent = `${name} • Security Gate Guidance`;
        showToast('Community configuration updated.', 'success');
      }
    });

    // Share Community Live Modal
    document.getElementById('btnShareCommunity')?.addEventListener('click', () => {
      const urlInput = document.getElementById('shareLiveUrlInput');
      const roomInput = document.getElementById('syncRoomIdInput');
      if (urlInput) {
        const currentUrl = window.location.href.split('?')[0];
        urlInput.value = `${currentUrl}?room=${store.getCommunityId()}`;
      }
      if (roomInput) {
        roomInput.value = store.getCommunityId();
      }
      openModal('modalShareCommunity');
    });

    document.getElementById('btnCopyShareUrl')?.addEventListener('click', () => {
      const urlInput = document.getElementById('shareLiveUrlInput');
      if (urlInput) {
        urlInput.select();
        navigator.clipboard?.writeText(urlInput.value).then(() => {
          showToast('Shareable link copied to clipboard!', 'success');
        }).catch(() => {
          document.execCommand('copy');
          showToast('Shareable link copied to clipboard!', 'success');
        });
      }
    });

    document.getElementById('btnSwitchRoomId')?.addEventListener('click', () => {
      const roomInput = document.getElementById('syncRoomIdInput');
      const newRoom = roomInput ? roomInput.value.trim() : '';
      if (newRoom) {
        store.setCommunityId(newRoom);
        showToast(`Switched to Cloud Sync Room: ${newRoom}`, 'success');
        closeAllModals();
      }
    });

    // Live Device Camera Scanner (Optical Plate Reader)
    let cameraStream = null;
    const btnStartCamera = document.getElementById('btnStartRealCamera');
    const btnStopCamera = document.getElementById('btnStopRealCamera');
    const cameraBox = document.getElementById('liveCameraContainer');
    const videoEl = document.getElementById('liveCameraVideo');

    btnStartCamera?.addEventListener('click', async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast('Camera API is not supported in this browser.', 'error');
          return;
        }

        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });

        if (videoEl) {
          videoEl.srcObject = cameraStream;
          videoEl.play();
        }

        if (cameraBox) cameraBox.style.display = 'block';
        if (btnStartCamera) btnStartCamera.style.display = 'none';
        if (btnStopCamera) btnStopCamera.style.display = 'inline-flex';

        showToast('Real camera active! Align license plate inside frame.', 'info');
      } catch (err) {
        console.error('Camera error:', err);
        showToast('Camera permission denied or camera not found.', 'error');
      }
    });

    btnStopCamera?.addEventListener('click', () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      if (cameraBox) cameraBox.style.display = 'none';
      if (btnStartCamera) btnStartCamera.style.display = 'inline-flex';
      if (btnStopCamera) btnStopCamera.style.display = 'none';
      showToast('Camera closed.', 'info');
    });

    // Check URL parameters for community room on startup
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam !== store.getCommunityId()) {
      store.setCommunityId(roomParam);
      showToast(`Joined shared community room: ${roomParam}`, 'success');
    }
  }

  // Start app
  init();
});
