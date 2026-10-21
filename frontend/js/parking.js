/**
 * parking.js — Find Parking & Parking Bay Grid Modules
 *
 * Implements:
 * 1. Find Parking form with user-editable start/end dates and times, preset duration chips,
 *    preferred facility choice, max distance filter, and synchronization with simulated network clock.
 * 2. 20-minute reservation timeout countdown with auto-suggestion of nearby parking slots.
 * 3. 20 slots per parking facility (LOT-A, LOT-B, LOT-C: Total 60 bays) with architectural layout.
 * 4. Dijkstra shortest-path alternative slot recommendations with distance, route, and timing.
 * 5. Professional transit UI with zero generic AI emoji icons and high information density.
 */

// ============================================================
// FIND PARKING MODULE
// ============================================================

let graphNodes = [];
let bookingHoldTimerId = null;

// 9 Urban Road Network Nodes Definition
const DIJKSTRA_NODES_DEF = [
    { id: 'N1', name: 'Idam North Gateway', area: 'Market Entrance Gate', lot: null, x: 80, y: 55 },
    { id: 'N2', name: 'Market Complex', area: 'Market Junction', lot: null, x: 230, y: 55 },
    { id: 'N3', name: 'Civic Centre', area: 'Civic Plaza', lot: null, x: 80, y: 155 },
    { id: 'N4', name: 'Tech Boulevard', area: 'Tech Corridor', lot: null, x: 230, y: 155 },
    { id: 'N5', name: 'Central Square', area: 'Town Center', lot: null, x: 370, y: 155 },
    { id: 'N6', name: 'North Gate Plaza', area: 'North Plaza (LOT-A)', lot: 'LOT-A', x: 440, y: 55 },
    { id: 'N7', name: 'Financial District', area: 'Banking Sector', lot: null, x: 370, y: 255 },
    { id: 'N8', name: 'Central Commercial', area: 'Central Hub (LOT-B)', lot: 'LOT-B', x: 510, y: 155 },
    { id: 'N9', name: 'South Metro Terminal', area: 'Metro Station (LOT-C)', lot: 'LOT-C', x: 510, y: 255 }
];

function renderDijkstraNodeChips(activeId = 'N1') {
    return DIJKSTRA_NODES_DEF.map(n => `
        <button type="button" class="dijkstra-node-chip ${n.id === activeId ? 'active' : ''}"
            onclick="selectDijkstraNode('${n.id}')"
            title="${escapeHtml(n.name)} (${escapeHtml(n.area)})">
            <span class="chip-id">${n.id}</span>
            <span>${escapeHtml(n.name)}</span>
            ${n.lot ? `<span class="chip-lot-badge">${n.lot}</span>` : ''}
        </button>
    `).join('');
}

async function loadFindParking() {
    const container = document.getElementById('find-parking-content');
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    let simTime = 480;
    try {
        const [nodes, timeData] = await Promise.all([
            API.getGraphNodes().catch(() => []),
            API.getSimulatedTime().catch(() => ({ simulatedTime: 480 }))
        ]);
        graphNodes = nodes;
        simTime = timeData.simulatedTime || 480;
    } catch (e) {
        // Fallback
    }

    container.innerHTML = renderFindParkingForm(simTime);
    attachFindParkingEvents();
    updateLivePricingEstimator();
    updateDijkstraNearbyArea(document.getElementById('origin-node')?.value || 'N1');
}

function renderFindParkingForm(simMinutes) {
    const nodeOptions = (graphNodes && graphNodes.length > 0)
        ? graphNodes.map(n => `<option value="${escapeHtml(n.id)}">${escapeHtml(n.id)} – ${escapeHtml(n.name)}</option>`).join('')
        : `
            <option value="N1">N1 – North Gateway (Market Entrance)</option>
            <option value="N2">N2 – Market Complex Junction</option>
            <option value="N3">N3 – Civic Centre</option>
            <option value="N4">N4 – Tech Boulevard</option>
            <option value="N5">N5 – Central Square</option>
            <option value="N6">N6 – North Gate Plaza (LOT-A)</option>
            <option value="N7">N7 – Financial District</option>
            <option value="N8">N8 – Central Commercial (LOT-B)</option>
            <option value="N9">N9 – South Metro Terminal (LOT-C)</option>
        `;

    // Compute intelligent initial defaults matching the simulated network clock & logged in session
    const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
    const isUserRole = session && session.role !== 'admin';
    const activeVehicleId = (session && session.vehicleId) ? session.vehicleId : 'KA-01-AB-1234';
    const activeOwnerName = (session && session.name) ? session.name : 'John Doe';
    const activeVehicleType = (session && session.vehicleType) ? session.vehicleType : 'CAR';
    const activeAccessible = !!(session && session.accessiblePermit);

    const startMins = simMinutes;
    const endMins = (simMinutes + 120) % 1440; // Default 2-hour duration
    const startTimeStr = minutesToTime(startMins);
    const endTimeStr = minutesToTime(endMins);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let endDateStr = todayStr;
    if (simMinutes + 120 >= 1440) {
        const tomorrow = new Date(now.getTime() + 86400000);
        endDateStr = tomorrow.toISOString().split('T')[0];
    }

    return `
        <div class="find-parking-layout">

            <!-- LEFT COLUMN: User-Friendly Booking Console -->
            <div class="card" style="box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-radius: 12px;">
                <div class="card-header" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 1px solid var(--border-medium); padding: 1.15rem 1.25rem;">
                    <div>
                        <div class="card-title" style="font-size: 1.15rem; font-weight: 800; display:flex; align-items:center; gap: 8px;">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#0284c7;fill:none;stroke-width:2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            Find &amp; Reserve Parking Bay
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                            Smart multi-facility allocation with instant live stall confirmation
                        </div>
                    </div>
                    <span class="badge badge-available" style="font-size: 0.72rem; padding: 4px 10px;">⚡ Instant Allocation</span>
                </div>
                <div class="card-body" style="padding: 1.25rem;">

                    ${isUserRole ? `
                    <div class="user-profile-badge-box mb-3" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.65rem 0.85rem; display:flex; align-items:center; justify-content:space-between">
                        <div style="display:flex; align-items:center; gap:0.5rem">
                            <span style="font-size:0.75rem; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.04em">Driver Account:</span>
                            <span style="font-weight:700; color:#0f172a; font-size:0.85rem">${escapeHtml(activeOwnerName)}</span>
                        </div>
                        <span style="font-family:var(--font-mono); font-weight:700; color:#047857; background:#dcfce7; padding:2px 7px; border-radius:4px; font-size:0.8rem">${escapeHtml(activeVehicleId)}</span>
                    </div>
                    ` : ''}

                    <form id="find-parking-form" novalidate>

                        <!-- STEP 1: Driver & Vehicle Identity -->
                        <div class="booking-step-card">
                            <div class="booking-step-header">
                                <span class="booking-step-badge">1</span>
                                <h4 class="booking-step-title">Driver &amp; Vehicle</h4>
                                <span class="booking-step-desc">Pure Tariff (Zero GST)</span>
                            </div>

                            <!-- Visual Vehicle Type Selector Cards -->
                            <label class="form-label mb-2">
                                Select Vehicle Classification <span class="required">*</span>
                            </label>
                            <div class="vehicle-type-selector">
                                <div class="vehicle-type-card ${activeVehicleType === 'CAR' ? 'active' : ''}" data-type="CAR" onclick="selectVehicleTypeCard('CAR')">
                                    <div class="vehicle-check-badge">✓</div>
                                    <div class="vehicle-icon-wrap">🚗</div>
                                    <div class="vehicle-card-info">
                                        <div class="vehicle-card-title">Passenger Car</div>
                                        <div class="vehicle-card-rate">₹50 / hr</div>
                                        <div class="vehicle-card-sub">Standard bays</div>
                                    </div>
                                </div>
                                <div class="vehicle-type-card ${activeVehicleType === 'TWO_WHEELER' ? 'active' : ''}" data-type="TWO_WHEELER" onclick="selectVehicleTypeCard('TWO_WHEELER')">
                                    <div class="vehicle-check-badge">✓</div>
                                    <div class="vehicle-icon-wrap">🏍️</div>
                                    <div class="vehicle-card-info">
                                        <div class="vehicle-card-title">Two-Wheeler</div>
                                        <div class="vehicle-card-rate">₹20 / hr</div>
                                        <div class="vehicle-card-sub">Motorbike / Scooter</div>
                                    </div>
                                </div>
                            </div>
                            <select id="fp-vehicle-type" style="display:none" onchange="onVehicleTypeOrTimeChanged()">
                                <option value="CAR" ${activeVehicleType === 'CAR' ? 'selected' : ''}>CAR</option>
                                <option value="TWO_WHEELER" ${activeVehicleType === 'TWO_WHEELER' ? 'selected' : ''}>TWO_WHEELER</option>
                            </select>

                            <div class="form-row">
                                <!-- Vehicle Registration Number -->
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-vehicle-id">
                                        Vehicle Plate Number <span class="required">*</span>
                                    </label>
                                    <input type="text" id="fp-vehicle-id" class="form-control text-mono"
                                        placeholder="e.g. KA-01-AB-1234" value="${escapeHtml(activeVehicleId)}"
                                        autocomplete="off" required style="font-weight:700; text-transform:uppercase"
                                    />
                                    <div class="form-error" id="fp-vehicle-id-error">Please enter a valid vehicle registration plate.</div>
                                </div>

                                <!-- Owner's Name -->
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-owner-name">
                                        Driver Name <span class="required">*</span>
                                    </label>
                                    <input type="text" id="fp-owner-name" class="form-control"
                                        placeholder="e.g. Anand Kumar" value="${escapeHtml(activeOwnerName)}" required />
                                    <div class="form-error" id="fp-owner-name-error">Please enter the owner's name.</div>
                                </div>
                            </div>

                            <!-- Accessibility Permit Option -->
                            <div class="mt-3" style="padding-top:0.75rem; border-top: 1px dashed var(--border-light)">
                                <label class="d-flex align-center gap-2" style="cursor:pointer; margin:0">
                                    <input type="checkbox" id="fp-accessible" style="width:16px;height:16px;accent-color:#0284c7" ${activeAccessible ? 'checked' : ''} />
                                    <span style="font-size:0.82rem; font-weight:700; color:var(--text-main)">
                                        Authorized Accessible / Disability Mobility Permit
                                    </span>
                                </label>
                                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px; margin-left:24px">
                                    Allocates dedicated high-priority accessible stalls closest to facility entrances.
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: Parking Interval Schedule & Live Pure Fee -->
                        <div class="booking-step-card">
                            <div class="booking-step-header">
                                <span class="booking-step-badge">2</span>
                                <h4 class="booking-step-title">Schedule &amp; Duration</h4>
                                <div class="d-flex align-center gap-1" style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:4px; padding:2px 7px; margin-left:auto">
                                    <span class="current-time-pulse-indicator" style="width:6px;height:6px"></span>
                                    <span style="font-size:0.68rem;font-weight:700;color:#065f46">NOW:</span>
                                    <span class="text-mono" id="find-parking-current-time" style="font-size:0.72rem;font-weight:700;color:#065f46">--:--:--</span>
                                </div>
                            </div>

                            <!-- Quick Preset Duration Pills + Sync Current Time Button -->
                            <div class="duration-pills mb-3" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
                                <span style="font-size:0.72rem; color:var(--text-muted); align-self:center; font-weight:700">Duration:</span>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(30)">+30m</button>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(60)">+1 hr</button>
                                <button type="button" class="duration-pill active" onclick="setDurationPreset(120)">+2 hrs</button>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(240)">+4 hrs</button>
                                <button type="button" class="btn btn-ghost btn-sm" onclick="syncBookingWithCurrentTime()" style="margin-left:auto;font-size:0.72rem;padding:3px 8px;border:1px solid var(--border-medium);background:#fff">
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    Start From Current Time
                                </button>
                            </div>

                            <!-- Parking From: Date + Time -->
                            <div class="form-row mb-2">
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-start-date">
                                        Parking From (Date) <span class="required">*</span>
                                    </label>
                                    <input type="date" id="fp-start-date" class="form-control text-mono"
                                        value="${todayStr}" min="${todayStr}" required onchange="onVehicleTypeOrTimeChanged()" />
                                    <div class="form-error" id="fp-start-date-error">Start date cannot be in the past.</div>
                                </div>

                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-start-time">
                                        Parking From (Time) <span class="required">*</span>
                                    </label>
                                    <input type="time" id="fp-start-time" class="form-control text-mono"
                                        value="${startTimeStr}" required onchange="onVehicleTypeOrTimeChanged()" />
                                    <div class="form-error" id="fp-start-time-error">Please set a valid start time.</div>
                                </div>
                            </div>

                            <!-- Parking Until: Date + Time -->
                            <div class="form-row">
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-end-date">
                                        Parking Until (Date) <span class="required">*</span>
                                    </label>
                                    <input type="date" id="fp-end-date" class="form-control text-mono"
                                        value="${endDateStr}" min="${todayStr}" required onchange="onVehicleTypeOrTimeChanged()" />
                                    <div class="form-error" id="fp-end-date-error">End date cannot precede start date.</div>
                                </div>

                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-end-time">
                                        Parking Until (Time) <span class="required">*</span>
                                    </label>
                                    <input type="time" id="fp-end-time" class="form-control text-mono"
                                        value="${endTimeStr}" required onchange="onVehicleTypeOrTimeChanged()" />
                                    <div class="form-error" id="fp-end-time-error">End time must be after start time.</div>
                                </div>
                            </div>

                            <!-- Live Dynamic Pricing & Pure Fee Estimator Card -->
                            <div id="dynamic-pricing-estimator" class="dynamic-pricing-card" style="margin-top:0.85rem">
                                <!-- Computed via updateLivePricingEstimator() -->
                            </div>
                        </div>

                        <!-- STEP 3: Origin Location & Facility Preferences -->
                        <div class="booking-step-card">
                            <div class="booking-step-header">
                                <span class="booking-step-badge">3</span>
                                <h4 class="booking-step-title">Location &amp; Facility</h4>
                                <span class="booking-step-desc">Dijkstra Routing</span>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="origin-node">
                                    Current Location / Entry Node <span class="required">*</span>
                                </label>
                                <select id="origin-node" class="form-control" onchange="selectDijkstraNode(this.value)">
                                    ${nodeOptions}
                                </select>
                                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px">
                                    💡 <em>Or click any node on the map to the right to select your origin.</em>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-preferred-lot">
                                        Preferred Parking Facility
                                    </label>
                                    <select id="fp-preferred-lot" class="form-control">
                                        <option value="" selected>Automatic (Nearest via Dijkstra)</option>
                                        <option value="LOT-A">North Gate Plaza (LOT-A, Node N6)</option>
                                        <option value="LOT-B">Central Commercial Lot (LOT-B, Node N8)</option>
                                        <option value="LOT-C">South Metro Terminal (LOT-C, Node N9)</option>
                                    </select>
                                </div>

                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-max-distance">
                                        Max Transit Distance
                                    </label>
                                    <select id="fp-max-distance" class="form-control">
                                        <option value="-1" selected>Any Distance (Unrestricted)</option>
                                        <option value="0.5">Within 500 m (0.5 km)</option>
                                        <option value="1.0">Within 1.0 km (~3 mins transit)</option>
                                        <option value="2.0">Within 2.0 km (~6 mins transit)</option>
                                        <option value="3.0">Within 3.0 km (~9 mins transit)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div id="find-parking-alert"></div>

                        <!-- Submit CTA Button -->
                        <button type="submit" id="find-parking-btn" class="btn btn-primary btn-block btn-lg" style="padding:0.9rem 1.25rem; font-size:1rem; font-weight:800; border-radius:8px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <span class="btn-text">Confirm &amp; Allocate Best Bay • <span id="btn-estimated-fee">₹100</span></span>
                        </button>

                        <!-- 20-Minute Arrival Check-In Rule Note -->
                        <div class="timeout-notice-box mt-3" style="margin-bottom:0; padding:0.75rem 0.9rem">
                            <div class="timeout-notice-icon" style="width:28px;height:28px">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <div class="timeout-notice-content">
                                <h4 style="font-size:0.8rem">20-Minute Arrival Hold Rule</h4>
                                <p style="font-size:0.74rem">Upon reserving, your assigned bay is held for <strong>20 minutes</strong> to complete gate check-in and update space status to OCCUPIED.</p>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            <!-- RIGHT COLUMN: Live Dijkstra Topological Navigator & Real-Time Availability -->
            <div id="booking-result-panel">
                <div class="dijkstra-explorer-box" id="dijkstra-explorer-panel" style="box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-radius: 12px; padding: 1.25rem;">
                    <div class="dijkstra-section-title">
                        <div style="display:flex;align-items:center;gap:8px">
                            <span class="booking-step-badge" style="background:#059669">📍</span>
                            <h4 style="margin:0">Live Dijkstra Topological Navigator</h4>
                        </div>
                        <span class="badge badge-available">Live Optimal Routing</span>
                    </div>
                    <div class="dijkstra-section-desc">
                        Select any node below to inspect real-time road topology, <strong>driver shortest path</strong>, transit minutes, and available bays.
                    </div>

                    <!-- Interactive 9-Node Selector Chips -->
                    <div class="dijkstra-node-chips" id="dijkstra-chips-container">
                        ${renderDijkstraNodeChips('N1')}
                    </div>

                    <!-- Dynamic Nearby Area & Route Details Panel for Chosen Node -->
                    <div id="dijkstra-nearby-area-container">
                        <div style="padding:2rem;text-align:center"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div></div>
                    </div>
                </div>
            </div>

        </div>
    `;
}


function selectVehicleTypeCard(type) {
    const sel = document.getElementById('fp-vehicle-type');
    if (sel) {
        sel.value = type;
    }
    document.querySelectorAll('.vehicle-type-card').forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-type') === type);
    });
    onVehicleTypeOrTimeChanged();
}
window.selectVehicleTypeCard = selectVehicleTypeCard;

function toggleBookingResultView(view) {
    const passView = document.getElementById('booking-pass-view');
    const mapView = document.getElementById('booking-map-view');
    const passBtn = document.getElementById('btn-view-pass');
    const mapBtn = document.getElementById('btn-view-map');

    if (view === 'map') {
        if (passView) passView.style.display = 'none';
        if (mapView) mapView.style.display = 'block';
        if (passBtn) passBtn.classList.remove('active');
        if (mapBtn) mapBtn.classList.add('active');
        const originNode = document.getElementById('origin-node')?.value || 'N1';
        updateDijkstraNearbyArea(originNode);
    } else {
        if (passView) passView.style.display = 'block';
        if (mapView) mapView.style.display = 'none';
        if (passBtn) passBtn.classList.add('active');
        if (mapBtn) mapBtn.classList.remove('active');
    }
}
window.toggleBookingResultView = toggleBookingResultView;

function onVehicleTypeOrTimeChanged() {
    const sel = document.getElementById('fp-vehicle-type');
    if (sel) {
        document.querySelectorAll('.vehicle-type-card').forEach(card => {
            card.classList.toggle('active', card.getAttribute('data-type') === sel.value);
        });
    }
    updateLivePricingEstimator();
    const originNode = document.getElementById('origin-node')?.value || 'N1';
    updateDijkstraNearbyArea(originNode);
}

function selectDijkstraNode(nodeId) {
    if (!nodeId) return;
    const originSelect = document.getElementById('origin-node');
    if (originSelect && originSelect.value !== nodeId) {
        originSelect.value = nodeId;
    }
    
    // Update chip active states
    document.querySelectorAll('.dijkstra-node-chip').forEach(chip => {
        const idSpan = chip.querySelector('.chip-id');
        chip.classList.toggle('active', idSpan && idSpan.textContent.trim() === nodeId);
    });

    updateDijkstraNearbyArea(nodeId);
}

async function updateDijkstraNearbyArea(nodeId = 'N1') {
    const container = document.getElementById('dijkstra-nearby-area-container');
    if (!container) return;

    const vehicleType = document.getElementById('fp-vehicle-type')?.value || 'CAR';
    const startDateStr = document.getElementById('fp-start-date')?.value;
    const startTimeStr = document.getElementById('fp-start-time')?.value;
    const endDateStr = document.getElementById('fp-end-date')?.value;
    const endTimeStr = document.getElementById('fp-end-time')?.value;

    let durationMinutes = 120;
    if (startDateStr && startTimeStr && endDateStr && endTimeStr) {
        const startMins = timeToMinutes(startTimeStr);
        const endMins = timeToMinutes(endTimeStr);
        if (endDateStr === startDateStr && endMins > startMins) {
            durationMinutes = endMins - startMins;
        } else if (endDateStr > startDateStr) {
            const startD = new Date(`${startDateStr}T${startTimeStr}:00`);
            const endD = new Date(`${endDateStr}T${endTimeStr}:00`);
            const diff = Math.round((endD - startD) / 60000);
            if (diff > 0) durationMinutes = diff;
        }
    }

    const nodeDef = DIJKSTRA_NODES_DEF.find(n => n.id === nodeId) || { id: nodeId, name: 'Node ' + nodeId, area: 'District Junction', lot: null };

    try {
        const data = await API.getNearbyGraph(nodeId, vehicleType, durationMinutes);
        if (!data || !data.success) {
            container.innerHTML = `<div class="alert alert-error">Unable to query nearby area topology.</div>`;
            return;
        }

        const rawNode = data.node || data.selectedNode || {};
        const node = {
            id: rawNode.id || rawNode.nodeId || nodeDef.id,
            name: rawNode.name || nodeDef.name,
            area: nodeDef.area || 'Commercial Corridor',
            lot: nodeDef.lot || null
        };
        const neighbors = data.neighbors || data.connectedNeighbors || [];
        const lots = data.lots || data.nearbyLots || [];

        // Determine the best shortest path parking lot for the driver
        const shortestLot = data.bestShortestLot || lots.find(l => l.isNearest) || (lots.length > 0 ? lots[0] : null);
        const targetNodeId = shortestLot ? (shortestLot.locationNode || shortestLot.lotNode || (shortestLot.lotId === 'LOT-A' ? 'N6' : shortestLot.lotId === 'LOT-B' ? 'N8' : 'N9')) : '';
        const shortestPureFee = shortestLot ? (shortestLot.formattedCost || calculateParkingFee(vehicleType, durationMinutes).totalCostFormatted) : '₹100';

        container.innerHTML = `
            <div class="dijkstra-nearby-panel fade-in">
                <!-- Clean Origin Node Header (No Unwanted Logo) -->
                <div class="origin-node-header">
                    <div class="origin-node-left">
                        <span class="origin-node-badge">${escapeHtml(node.id)}</span>
                        <div class="origin-node-meta">
                            <div class="origin-node-title">${escapeHtml(node.name)}</div>
                            <div class="origin-node-sub">${escapeHtml(node.area)} • Origin Junction</div>
                        </div>
                    </div>
                    <div class="origin-node-right">
                        <span class="origin-status-pill">${node.lot ? 'Direct Access to ' + escapeHtml(node.lot) : 'Road Intersection'}</span>
                    </div>
                </div>

                <!-- Driver Shortest Path Callout Hero (Crystal Clear Guidance) -->
                ${shortestLot ? `
                <div class="driver-shortest-callout">
                    <div class="shortest-callout-header">
                        <span class="shortest-badge">⚡ BEST SHORTEST PATH FOR DRIVER</span>
                        <span class="shortest-select-node-guide">
                            Driver Target: <strong>Node ${escapeHtml(targetNodeId)} (${escapeHtml(shortestLot.lotId)})</strong>
                        </span>
                    </div>
                    <div class="shortest-callout-body">
                        <div class="shortest-dest-info">
                            <h3 class="shortest-lot-name">${escapeHtml(shortestLot.lotName)}</h3>
                            <div class="shortest-route-sequence">
                                <span class="route-tag">Optimal Route:</span>
                                <strong class="route-nodes">${escapeHtml(shortestLot.travelRoute || `${node.id} ➔ ${targetNodeId}`)}</strong>
                            </div>
                        </div>
                        <div class="shortest-stats-grid">
                            <div class="shortest-stat">
                                <div class="s-val text-brand">${shortestLot.travelTimeMinutes} min</div>
                                <div class="s-lbl">Transit Time</div>
                            </div>
                            <div class="shortest-stat">
                                <div class="s-val">${shortestLot.distanceKm} km</div>
                                <div class="s-lbl">Shortest Distance</div>
                            </div>
                            <div class="shortest-stat">
                                <div class="s-val text-success">${shortestLot.availableSpaces} Free</div>
                                <div class="s-lbl">Available Bays</div>
                            </div>
                            <div class="shortest-stat">
                                <div class="s-val text-price">${escapeHtml(shortestPureFee)}</div>
                                <div class="s-lbl">Pure Fee (Zero GST)</div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary btn-block shortest-action-btn"
                        onclick="quickSelectLotFromDijkstra('${escapeHtml(shortestLot.lotId)}')">
                        ✔ Select Node ${escapeHtml(targetNodeId)} (${escapeHtml(shortestLot.lotId)}) as Shortest Destination
                    </button>
                </div>
                ` : ''}

                <!-- Direct Connected Streets (1-Hop Neighbors) -->
                <div class="nearby-streets-block">
                    <div class="dijkstra-subheading">
                        Direct Connected Streets from Node ${escapeHtml(node.id)} (${neighbors.length} Adjacent Nodes)
                    </div>
                    <div class="nearby-streets-grid">
                        ${neighbors.map(nb => {
                            const nId = nb.neighborNodeId || nb.nodeId;
                            const rName = nb.roadName || nb.name;
                            return `
                                <div class="adjacent-street-pill" onclick="selectDijkstraNode('${escapeHtml(nId)}')">
                                    <span class="dest-node">${escapeHtml(nId)}</span>
                                    <div class="street-info">
                                        <div class="street-name">${escapeHtml(rName)}</div>
                                        <div class="street-meta">${nb.distanceKm} km • ~${nb.travelTimeMinutes}m transit</div>
                                    </div>
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--color-brand-accent);fill:none;stroke-width:2.5;margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Dijkstra Comparison Cards for All 3 Facilities -->
                <div class="dijkstra-destinations-block">
                    <div class="dijkstra-subheading">
                        All Parking Facilities from Node ${escapeHtml(node.id)} (Ranked by Travel Time • Pure Parking Fee)
                    </div>
                    <div class="dijkstra-lots-grid">
                        ${lots.map((lot, idx) => `
                            <div class="dijkstra-lot-card ${lot.isNearest ? 'nearest-lot' : ''}">
                                ${lot.isNearest ? '<div class="nearest-ribbon">#1 SHORTEST PATH</div>' : ''}
                                <div class="lot-card-top">
                                    <div>
                                        <div class="lot-id-badge">${idx === 0 ? '🏆 Recommended' : 'Option ' + (idx + 1)} • ${escapeHtml(lot.lotId)}</div>
                                        <div class="lot-name-title">${escapeHtml(lot.lotName)}</div>
                                        <div class="lot-node-dest">Select Node: <strong>Node ${escapeHtml(lot.locationNode)}</strong></div>
                                    </div>
                                    <div class="lot-pricing-chip">
                                        <div class="lot-fee-amount">${escapeHtml(lot.formattedCost)}</div>
                                        <div class="lot-fee-rate">${escapeHtml(lot.hourlyRateFormatted)} (No GST)</div>
                                    </div>
                                </div>

                                <div class="lot-route-box">
                                    <div class="route-label">Dijkstra Route:</div>
                                    <div class="route-nodes-sequence">${escapeHtml(lot.travelRoute)}</div>
                                </div>

                                <div class="lot-stats-row">
                                    <div class="stat-cell">
                                        <span class="stat-label">Transit Time</span>
                                        <span class="stat-val"><strong>${lot.travelTimeMinutes}</strong> mins</span>
                                    </div>
                                    <div class="stat-cell">
                                        <span class="stat-label">Distance</span>
                                        <span class="stat-val"><strong>${lot.distanceKm}</strong> km</span>
                                    </div>
                                    <div class="stat-cell">
                                        <span class="stat-label">Free Bays</span>
                                        <span class="stat-val" style="color:${lot.availableSpaces > 0 ? '#059669' : '#dc2626'}"><strong>${lot.availableSpaces}</strong> / 20</span>
                                    </div>
                                </div>

                                <button type="button" class="btn ${lot.isNearest ? 'btn-primary' : 'btn-outline'} btn-sm btn-block mt-2"
                                    onclick="quickSelectLotFromDijkstra('${escapeHtml(lot.lotId)}')">
                                    ${lot.isNearest ? '✔ Select Shortest Path (' + escapeHtml(lot.lotId) + ')' : 'Select ' + escapeHtml(lot.lotId) + ' (' + escapeHtml(lot.formattedCost) + ')'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Interactive Road Topology SVG Graph -->
                <div class="dijkstra-map-container">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;flex-wrap:wrap;gap:4px">
                        <span style="font-size:0.75rem;font-weight:700;color:var(--text-main);text-transform:uppercase;letter-spacing:0.04em">Road Network Topology (Click any node to navigate)</span>
                        <span style="font-size:0.72rem;color:#0284c7;font-weight:700">Origin: ${escapeHtml(node.id)} ➔ Target: ${shortestLot ? escapeHtml(shortestLot.locationNode) : 'N6'}</span>
                    </div>
                    ${renderDijkstraSvgMap(node.id, neighbors, lots, shortestLot)}
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-error">Failed loading nearby area: ${escapeHtml(e.message)}</div>`;
    }
}

function renderDijkstraSvgMap(activeNodeId, neighbors = [], lots = [], shortestLot = null) {
    const neighborIds = new Set(neighbors.map(nb => nb.neighborNodeId || nb.nodeId));
    const lotNodes = {
        'N6': { lotId: 'LOT-A', name: 'North Gate' },
        'N8': { lotId: 'LOT-B', name: 'Central Commercial' },
        'N9': { lotId: 'LOT-C', name: 'South Metro' }
    };

    // Extract shortest path node set to highlight route on graph
    const shortestNodeIds = new Set();
    if (shortestLot && shortestLot.travelRoute) {
        const parts = shortestLot.travelRoute.split(/->|➔|–/).map(s => s.trim().toUpperCase()).filter(Boolean);
        parts.forEach(p => shortestNodeIds.add(p));
    } else {
        shortestNodeIds.add(activeNodeId);
        if (shortestLot && shortestLot.locationNode) shortestNodeIds.add(shortestLot.locationNode);
    }

    const edges = [
        { u: 'N1', v: 'N2', dist: '0.8 km' },
        { u: 'N1', v: 'N3', dist: '1.2 km' },
        { u: 'N2', v: 'N4', dist: '1.0 km' },
        { u: 'N2', v: 'N6', dist: '1.5 km' },
        { u: 'N3', v: 'N4', dist: '1.1 km' },
        { u: 'N3', v: 'N7', dist: '1.4 km' },
        { u: 'N4', v: 'N5', dist: '0.9 km' },
        { u: 'N5', v: 'N6', dist: '1.3 km' },
        { u: 'N5', v: 'N8', dist: '1.2 km' },
        { u: 'N6', v: 'N8', dist: '1.8 km' },
        { u: 'N7', v: 'N8', dist: '1.6 km' },
        { u: 'N7', v: 'N9', dist: '1.0 km' },
        { u: 'N8', v: 'N9', dist: '1.1 km' }
    ];

    const nodeCoords = {};
    DIJKSTRA_NODES_DEF.forEach(n => {
        nodeCoords[n.id] = { x: n.x, y: n.y, name: n.name, lot: n.lot };
    });

    const edgeSvg = edges.map(e => {
        const p1 = nodeCoords[e.u];
        const p2 = nodeCoords[e.v];
        if (!p1 || !p2) return '';
        
        const isShortestPath = shortestNodeIds.has(e.u) && shortestNodeIds.has(e.v);
        const isIncident = (e.u === activeNodeId && neighborIds.has(e.v)) || (e.v === activeNodeId && neighborIds.has(e.u));
        
        let strokeColor = '#cbd5e1';
        let strokeWidth = '1.8';
        let strokeDash = 'none';

        if (isShortestPath) {
            strokeColor = '#10b981';
            strokeWidth = '4.5';
            strokeDash = '6,4';
        } else if (isIncident) {
            strokeColor = '#0284c7';
            strokeWidth = '2.8';
        }

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - 4;

        return `
            <g class="svg-edge">
                <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
                      stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" stroke-linecap="round" />
                ${(isIncident || isShortestPath) ? `<text x="${midX}" y="${midY}" fill="${isShortestPath ? '#059669' : '#0284c7'}" font-size="9" font-weight="700" text-anchor="middle" font-family="monospace">${e.dist}</text>` : ''}
            </g>
        `;
    }).join('');

    const targetNodeId = shortestLot ? (shortestLot.locationNode || shortestLot.lotNode || (shortestLot.lotId === 'LOT-A' ? 'N6' : shortestLot.lotId === 'LOT-B' ? 'N8' : 'N9')) : 'N6';

    const nodeSvg = DIJKSTRA_NODES_DEF.map(n => {
        const isActive = n.id === activeNodeId;
        const isTarget = n.id === targetNodeId;
        const isNeighbor = neighborIds.has(n.id);
        const hasLot = !!lotNodes[n.id];

        let fillColor = '#ffffff';
        let strokeColor = '#94a3b8';
        let strokeWidth = '2';
        let textFill = '#1e293b';

        if (isActive) {
            fillColor = '#0284c7';
            strokeColor = '#0369a1';
            strokeWidth = '3';
            textFill = '#ffffff';
        } else if (isTarget) {
            fillColor = '#10b981';
            strokeColor = '#047857';
            strokeWidth = '3.5';
            textFill = '#ffffff';
        } else if (isNeighbor) {
            fillColor = '#e0f2fe';
            strokeColor = '#38bdf8';
            strokeWidth = '2.5';
            textFill = '#0369a1';
        } else if (hasLot) {
            fillColor = '#ecfdf5';
            strokeColor = '#10b981';
            strokeWidth = '2.5';
            textFill = '#065f46';
        }

        return `
            <g class="svg-node" onclick="selectDijkstraNode('${n.id}')" style="cursor:pointer">
                ${(isActive || isTarget) ? `
                    <circle cx="${n.x}" cy="${n.y}" r="22" fill="${isActive ? 'rgba(2,132,199,0.2)' : 'rgba(16,185,129,0.2)'}" class="pulse-ring">
                        <animate attributeName="r" values="18;25;18" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/>
                    </circle>
                ` : ''}
                <circle cx="${n.x}" cy="${n.y}" r="16" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
                <text x="${n.x}" y="${n.y + 4}" fill="${textFill}" font-size="10" font-weight="800" text-anchor="middle" font-family="monospace" pointer-events="none">${n.id}</text>
                
                <!-- Label below -->
                <text x="${n.x}" y="${n.y + 26}" fill="${isActive ? '#0284c7' : (isTarget ? '#047857' : '#475569')}" font-size="9" font-weight="${(isActive || isTarget) ? '800' : '600'}" text-anchor="middle" pointer-events="none">
                    ${isActive ? 'START' : (isTarget ? 'TARGET' : escapeHtml(n.name.split(' ')[0]))}
                </text>

                <!-- Lot Tag if applicable -->
                ${hasLot ? `
                    <g transform="translate(${n.x - 18}, ${n.y - 27})">
                        <rect width="36" height="13" rx="3" fill="${isTarget ? '#059669' : '#10b981'}" />
                        <text x="18" y="10" fill="#ffffff" font-size="8" font-weight="800" text-anchor="middle" font-family="monospace">${lotNodes[n.id].lotId}</text>
                    </g>
                ` : ''}
            </g>
        `;
    }).join('');

    return `
        <svg viewBox="0 0 580 300" style="width:100%;height:auto;background:#f8fafc;border:1px solid var(--border-light);border-radius:8px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.03);display:block">
            <defs>
                <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#e2e8f0"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />
            ${edgeSvg}
            ${nodeSvg}
        </svg>
    `;
}

function quickSelectLotFromDijkstra(lotId) {
    const prefSelect = document.getElementById('fp-preferred-lot');
    if (prefSelect) {
        prefSelect.value = lotId;
    }
    showToast('success', 'Shortest Destination Selected', `Target facility set to ${lotId}. Submit form to confirm stall allocation.`);
}

function updateLivePricingEstimator() {
    const container = document.getElementById('dynamic-pricing-estimator');
    const vehicleTypeSelect = document.getElementById('fp-vehicle-type');
    const vehicleType = vehicleTypeSelect?.value || 'CAR';

    const startDateStr = document.getElementById('fp-start-date')?.value;
    const startTimeStr = document.getElementById('fp-start-time')?.value;
    const endDateStr = document.getElementById('fp-end-date')?.value;
    const endTimeStr = document.getElementById('fp-end-time')?.value;

    let durationMinutes = 120;
    if (startDateStr && startTimeStr && endDateStr && endTimeStr) {
        const startMins = timeToMinutes(startTimeStr);
        const endMins = timeToMinutes(endTimeStr);
        if (endDateStr === startDateStr && endMins > startMins) {
            durationMinutes = endMins - startMins;
        } else if (endDateStr > startDateStr) {
            const startD = new Date(`${startDateStr}T${startTimeStr}:00`);
            const endD = new Date(`${endDateStr}T${endTimeStr}:00`);
            const diff = Math.round((endD - startD) / 60000);
            if (diff > 0) durationMinutes = diff;
        }
    }

    const pricing = calculateParkingFee(vehicleType, durationMinutes);

    // Update button text
    const btnFee = document.getElementById('btn-estimated-fee');
    if (btnFee) {
        btnFee.textContent = pricing.totalCostFormatted;
    }

    if (!container) return;

    const isCar = vehicleType === 'CAR';
    container.innerHTML = `
        <div class="pricing-card-header">
            <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="pricing-card-icon">${isCar ? '🚗' : '🏍️'}</span>
                <div>
                    <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Dynamic Pricing Calculation</div>
                    <div style="font-size:0.95rem;font-weight:800;color:var(--text-main)">${isCar ? 'Standard Passenger Car' : 'Two-Wheeler / Motorbike'}</div>
                </div>
            </div>
            <span class="pricing-rate-pill ${isCar ? 'car' : 'bike'}">${pricing.hourlyRateFormatted}</span>
        </div>

        <div class="pricing-grid">
            <div class="pricing-cell">
                <span class="pricing-cell-label">Hourly Tariff</span>
                <span class="pricing-cell-val">${pricing.hourlyRateFormatted}</span>
            </div>
            <div class="pricing-cell">
                <span class="pricing-cell-label">Total Duration</span>
                <span class="pricing-cell-val">${pricing.durationFormatted} (${pricing.durationMinutes}m)</span>
            </div>
            <div class="pricing-cell highlight">
                <span class="pricing-cell-label">Estimated Total Fee</span>
                <span class="pricing-cell-val total">${pricing.totalCostFormatted}</span>
            </div>
        </div>

        <div class="pricing-breakdown-note">
            <span>Formula:</span> 
            <strong>${pricing.hourlyRateFormatted}</strong> × <strong>${pricing.hoursBilled} hrs</strong> = <strong style="color:#047857">${pricing.totalCostFormatted}</strong>
            <span style="color:#166534;font-weight:700;margin-left:auto">✔ Pure Parking Space Fee • Zero GST</span>
        </div>
    `;
}

function setDurationPreset(additionalMinutes) {
    const startInput = document.getElementById('fp-start-time');
    const endInput = document.getElementById('fp-end-time');
    const startDateInput = document.getElementById('fp-start-date');
    const endDateInput = document.getElementById('fp-end-date');
    if (!startInput || !endInput) return;

    let startVal = startInput.value;
    if (!startVal) startVal = "08:00";

    const [h, m] = startVal.split(':').map(Number);
    let startTotal = (h * 60) + (m || 0);
    let endTotal = startTotal + additionalMinutes;

    if (endTotal >= 1440 && startDateInput && endDateInput) {
        endInput.value = minutesToTime(endTotal % 1440);
        // Advance end date by 1 day
        const sDate = new Date(startDateInput.value || new Date());
        const eDate = new Date(sDate.getTime() + 86400000);
        endDateInput.value = eDate.toISOString().split('T')[0];
    } else {
        endInput.value = minutesToTime(endTotal % 1440);
        if (startDateInput && endDateInput) {
            endDateInput.value = startDateInput.value;
        }
    }

    // Update active pill styling
    document.querySelectorAll('.duration-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(additionalMinutes >= 60 ? `${additionalMinutes/60} hr` : `${additionalMinutes}m`));
    });

    updateLivePricingEstimator();
    updateDijkstraNearbyArea(document.getElementById('origin-node')?.value || 'N1');
}

function attachFindParkingEvents() {
    const form = document.getElementById('find-parking-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFindParkingSubmit();
    });
}

async function handleFindParkingSubmit() {
    const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
    const vehicleId = document.getElementById('fp-vehicle-id')?.value.trim().toUpperCase() || (session?.vehicleId || '');
    const ownerName = document.getElementById('fp-owner-name')?.value.trim() || (session?.name || 'Driver');
    const vehicleType = document.getElementById('fp-vehicle-type')?.value || (session?.vehicleType || 'CAR');
    const accessible = document.getElementById('fp-accessible') ? document.getElementById('fp-accessible').checked : !!(session?.accessiblePermit);
    const originNode = document.getElementById('origin-node')?.value || 'N1';
    const preferredLotId = document.getElementById('fp-preferred-lot')?.value || null;
    const maxDistanceKm = parseFloat(document.getElementById('fp-max-distance')?.value || '-1');

    const startDateStr = document.getElementById('fp-start-date')?.value;
    const startTimeStr = document.getElementById('fp-start-time')?.value;
    const endDateStr = document.getElementById('fp-end-date')?.value;
    const endTimeStr = document.getElementById('fp-end-time')?.value;

    let valid = true;

    // Reset inline errors
    document.querySelectorAll('.form-error').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));

    if (!vehicleId || vehicleId.length < 3) {
        document.getElementById('fp-vehicle-id')?.classList.add('error');
        const err = document.getElementById('fp-vehicle-id-error');
        if (err) err.style.display = 'block';
        valid = false;
    }

    if (!ownerName || ownerName.length < 2) {
        document.getElementById('fp-owner-name')?.classList.add('error');
        const err = document.getElementById('fp-owner-name-error');
        if (err) err.style.display = 'block';
        valid = false;
    }

    if (!startDateStr) {
        document.getElementById('fp-start-date')?.classList.add('error');
        const err = document.getElementById('fp-start-date-error');
        if (err) err.style.display = 'block';
        valid = false;
    }

    if (!startTimeStr) {
        document.getElementById('fp-start-time')?.classList.add('error');
        const err = document.getElementById('fp-start-time-error');
        if (err) err.style.display = 'block';
        valid = false;
    }

    const startMins = timeToMinutes(startTimeStr);
    const endMins = timeToMinutes(endTimeStr);

    let isPastOrInvalid = false;
    if (startDateStr && endDateStr) {
        if (endDateStr < startDateStr) {
            isPastOrInvalid = true;
        } else if (endDateStr === startDateStr && endMins <= startMins) {
            isPastOrInvalid = true;
        }
    }

    if (isPastOrInvalid) {
        document.getElementById('fp-end-time')?.classList.add('error');
        const err = document.getElementById('fp-end-time-error');
        if (err) {
            err.textContent = 'End time must be strictly after start time.';
            err.style.display = 'block';
        }
        valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('find-parking-btn');
    setButtonLoading(btn, true);

    try {
        const payload = {
            vehicleId,
            ownerName,
            vehicleType,
            accessiblePermit: accessible,
            originNode,
            preferredLotId: preferredLotId || null,
            maxDistanceKm: maxDistanceKm > 0 ? maxDistanceKm : -1,
            startTime: startMins,
            endTime: endMins,
            accessPriority: accessible ? 1 : 2
        };

        const result = await API.createBooking(payload);
        renderBookingResult(result, startMins, endMins, originNode);

    } catch (err) {
        // If HTTP 409 Conflict, render recommended alternatives
        if (err.status === 409 && err.data) {
            renderBookingResult(err.data, startMins, endMins, originNode);
            showToast('warning', 'Slot Conflict / Unavailable', err.data.message || 'Requested stall unavailable. Review alternatives below.');
        } else {
            showToast('error', 'Booking Notice', err.message);
        }
    } finally {
        setButtonLoading(btn, false);
    }
}

function renderBookingResult(result, startMins, endMins, originNode) {
    const panel = document.getElementById('booking-result-panel');
    if (!panel) return;

    if (bookingHoldTimerId) {
        clearInterval(bookingHoldTimerId);
        bookingHoldTimerId = null;
    }

    if (result.success && result.reservationId) {
        // Success: Render Digital Pass with 20-min countdown timer & Route Map Toggle
        panel.innerHTML = `
            <div class="result-view-toggle">
                <button type="button" class="view-toggle-btn active" id="btn-view-pass" onclick="toggleBookingResultView('pass')">
                    🎫 Active Digital Pass
                </button>
                <button type="button" class="view-toggle-btn" id="btn-view-map" onclick="toggleBookingResultView('map')">
                    🗺️ Live Route Map &amp; Topology
                </button>
            </div>

            <div id="booking-pass-view">
                <div class="parking-pass">
                    <div class="parking-pass-header">
                        <div>
                            <div class="pass-authority">Idam Nagar Urban Mobility Pass</div>
                            <div class="pass-id">${escapeHtml(result.reservationId)}</div>
                        </div>
                        <div class="pass-status-pill">
                            <span style="display:inline-block;width:6px;height:6px;background:#f59e0b;border-radius:50%"></span>
                            RESERVED (HOLD)
                        </div>
                    </div>

                    <!-- 20-Minute Countdown Arrival Banner -->
                    <div class="pass-timer-banner">
                        <div>
                            <div class="pass-timer-title">
                                <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;display:inline-block;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                20-Minute Gate Check-In Window
                            </div>
                            <div style="font-size:0.72rem;color:#78350f">Check-in at entrance gate before timeout expires.</div>
                        </div>
                        <div class="pass-countdown-digits" id="live-hold-countdown">20:00</div>
                    </div>

                    <div class="pass-body">
                        <!-- Assigned Bay Indicator -->
                        <div class="pass-bay-display">
                            <div>
                                <div class="pass-bay-label">Assigned Stall / Facility</div>
                                <div class="pass-bay-value">${escapeHtml(result.spaceId)}</div>
                                <div style="font-size:0.82rem;font-weight:600;color:var(--text-muted)">
                                    ${escapeHtml(result.lotName)} (Node ${escapeHtml(result.lotId)})
                                </div>
                            </div>
                            <div>
                                <div class="plate-badge">
                                    <span class="plate-ind">IND</span>
                                    <span class="plate-no">${escapeHtml(result.vehicleId)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Journey & Route Metrics via Dijkstra -->
                        <table class="pass-detail-table">
                            <tr>
                                <td>Vehicle Classification:</td>
                                <td><strong>${result.vehicleType === 'TWO_WHEELER' ? '🏍️ Two-Wheeler / Motorbike' : '🚗 Standard Passenger Car'}</strong></td>
                            </tr>
                            <tr>
                                <td>Tariff Rate:</td>
                                <td><strong class="pricing-rate-pill ${result.vehicleType === 'TWO_WHEELER' ? 'bike' : 'car'}">${escapeHtml(result.hourlyRateFormatted || (result.vehicleType === 'TWO_WHEELER' ? '₹20/hr' : '₹50/hr'))}</strong></td>
                            </tr>
                            <tr>
                                <td>Duration &amp; Interval:</td>
                                <td><strong>${result.durationMinutes || 120} mins</strong> (${escapeHtml(result.startTimeFormatted)} — ${escapeHtml(result.endTimeFormatted)})</td>
                            </tr>
                            <tr>
                                <td>Calculated Total Fee:</td>
                                <td><span class="total-cost-badge">${escapeHtml(result.formattedCost || (result.totalCost ? '₹' + Math.round(result.totalCost) : '₹100'))}</span> <span style="font-size:0.75rem; color:#059669; font-weight:700">• Pure Space Fee (Zero GST)</span></td>
                            </tr>
                            <tr>
                                <td>Shortest Route:</td>
                                <td>
                                    <div class="route-trail">
                                        ${escapeHtml(result.travelRoute || '[Direct Route]')}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Dijkstra Travel Time:</td>
                                <td><strong>${result.travelTimeMinutes} mins</strong> (Estimated transit)</td>
                            </tr>
                            <tr>
                                <td>Permitted Stall Type:</td>
                                <td>${escapeHtml(result.spaceType)} Stall</td>
                            </tr>
                        </table>

                        <!-- Immediate Gate Verification & Update Space Actions -->
                        <div class="d-flex gap-2 mt-4" style="flex-wrap:wrap">
                            <button class="btn btn-primary" id="btn-pass-checkin" style="flex:1" onclick="quickVerifyCheckIn('${escapeHtml(result.reservationId)}', '${escapeHtml(result.vehicleId)}')">
                                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                Confirm Gate Check-In (Arrival &amp; Update Space)
                            </button>
                            <button class="btn btn-secondary" onclick="openUpdateSpaceModal('${escapeHtml(result.reservationId)}', '${escapeHtml(result.spaceId)}')">
                                <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                Update Parking Space
                            </button>
                        </div>

                        <!-- Suggested Alternative Nearby Slots (Section 7) -->
                        ${renderNearbySuggestionsHtml(result.suggestions, result.lotId)}
                    </div>
                </div>
            </div>

            <div id="booking-map-view" style="display:none">
                <div class="dijkstra-explorer-box" id="dijkstra-explorer-panel" style="box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-radius: 12px; padding: 1.25rem;">
                    <div class="dijkstra-section-title">
                        <div style="display:flex;align-items:center;gap:8px">
                            <span class="booking-step-badge" style="background:#059669">📍</span>
                            <h4 style="margin:0">Live Dijkstra Route to ${escapeHtml(result.lotName)}</h4>
                        </div>
                        <span class="badge badge-available">Live Optimal Routing</span>
                    </div>
                    <div class="dijkstra-section-desc">
                        Optimal shortest route from origin <strong>Node ${escapeHtml(originNode)}</strong> to your assigned stall at <strong>${escapeHtml(result.lotName)} (${escapeHtml(result.lotId)})</strong>.
                    </div>

                    <!-- Interactive 9-Node Selector Chips -->
                    <div class="dijkstra-node-chips" id="dijkstra-chips-container">
                        ${renderDijkstraNodeChips(originNode)}
                    </div>

                    <!-- Dynamic Nearby Area & Route Details Panel for Chosen Node -->
                    <div id="dijkstra-nearby-area-container">
                        <div style="padding:2rem;text-align:center"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div></div>
                    </div>
                </div>
            </div>
        `;

        startLive20MinHoldTimer(20 * 60, result.reservationId);
        showToast('success', 'Space Allocated!', `Stall ${result.spaceId} reserved at ${result.lotName}.`);

    } else if (result.queued) {
        // Queued in PriorityQueue: Show recommendations
        panel.innerHTML = `
            <div class="card" style="border-top: 3px solid #f59e0b;">
                <div class="card-body">
                    <div class="d-flex align-center gap-3 mb-4">
                        <div style="width:40px;height:40px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#b45309">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:1rem;color:var(--text-main)">Queued in Waiting List</div>
                            <div style="font-size:0.8rem;color:var(--text-muted)">Request ID: <span class="text-mono">${escapeHtml(result.requestId)}</span></div>
                        </div>
                    </div>

                    <p style="font-size:0.85rem;color:var(--text-body);margin-bottom:1rem">
                        Nearest facility was fully booked. Your request is ranked in the deterministic PriorityQueue.
                    </p>

                    <!-- Render Alternative Nearby Lots (Section 7) -->
                    ${renderNearbySuggestionsHtml(result.suggestions)}
                </div>
            </div>
        `;
        showToast('warning', 'Queued', 'Added to PriorityQueue waiting list.');

    } else {
        // Full rejection or Conflict (Section 7: Recommended Alternative Parking)
        panel.innerHTML = `
            <div class="card" style="border-top: 3px solid #dc2626;">
                <div class="card-body">
                    <div class="d-flex align-center gap-3 mb-3">
                        <div style="width:36px;height:36px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#b91c1c">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:0.98rem;color:#b91c1c">Preferred Slot Unavailable</div>
                            <div style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(result.message || 'No direct stall available in requested lot.')}</div>
                        </div>
                    </div>

                    <!-- Section 7: Recommended Alternative Parking Layout -->
                    ${renderNearbySuggestionsHtml(result.suggestions)}
                </div>
            </div>
        `;
    }
}

function renderNearbySuggestionsHtml(suggestions, currentLotId = null) {
    if (!suggestions || suggestions.length === 0) return '';

    const alternatives = suggestions.filter(s => s.lotId !== currentLotId && s.availableSpaces > 0);
    if (alternatives.length === 0) return '';

    return `
        <div class="nearby-suggestions-card">
            <div class="nearby-title">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--color-brand-accent);fill:none;stroke-width:2">
                    <circle cx="12" cy="12" r="10"/><polygon points="12 8 8 12 12 16 12 8"/>
                </svg>
                Recommended Alternative Parking (Dijkstra Distance &amp; Dynamic Fee)
            </div>
            <div class="nearby-list">
                ${alternatives.map(s => `
                    <div class="nearby-item">
                        <div class="nearby-lot-meta">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap">
                                <h5>${escapeHtml(s.lotName)} <span class="text-mono text-muted text-sm">(${escapeHtml(s.lotId)})</span></h5>
                                <div style="font-weight:800;color:#047857;background:#dcfce7;border:1px solid #86efac;border-radius:4px;padding:2px 8px;font-size:0.8rem">
                                    ${escapeHtml(s.formattedCost || '₹100')} <span style="font-weight:600;color:#065f46;font-size:0.72rem">(${escapeHtml(s.hourlyRateFormatted || '₹50/hr')})</span>
                                </div>
                            </div>
                            <div class="nearby-lot-stats">
                                <span>Transit: <strong>${s.travelTimeMinutes} mins</strong> (${s.distanceKm} km)</span>
                                <span>Availability: <strong>${s.availableSpaces} bays free</strong></span>
                                <span class="text-mono">Node ${escapeHtml(s.locationNode)}</span>
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px">
                                Route: <span class="text-mono">${escapeHtml(s.travelRoute)}</span>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="quickBookAlternativeLot('${escapeHtml(s.lotId)}')">
                            Book This Slot (${escapeHtml(s.formattedCost || '₹100')})
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function startLive20MinHoldTimer(totalSeconds, resId) {
    let remaining = totalSeconds;
    const display = document.getElementById('live-hold-countdown');

    bookingHoldTimerId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(bookingHoldTimerId);
            bookingHoldTimerId = null;
            if (display) {
                display.textContent = "TIMED OUT (00:00)";
                display.style.color = "#dc2626";
            }
            showToast('error', 'Hold Timed Out', `Reservation ${resId} exceeded 20-minute check-in deadline.`);
            return;
        }

        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (display) {
            display.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        }
    }, 1000);
}

async function quickVerifyCheckIn(resId, vehicleId) {
    try {
        const res = await API.checkIn(resId, vehicleId);
        showToast('success', 'Arrival Verified!', `Gate check-in completed. Space ${res.spaceId || ''} updated to OCCUPIED.`);
        
        // Update live pass UI in place
        const passPill = document.querySelector('.pass-status-pill');
        if (passPill) {
            passPill.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:#10b981;border-radius:50%"></span> CHECKED IN (OCCUPIED)`;
            passPill.style.color = '#065f46';
            passPill.style.borderColor = '#a7f3d0';
            passPill.style.background = '#ecfdf5';
        }
        const timerBanner = document.querySelector('.pass-timer-banner');
        if (timerBanner) {
            timerBanner.style.background = '#ecfdf5';
            timerBanner.style.borderColor = '#a7f3d0';
            timerBanner.innerHTML = `
                <div class="d-flex align-center gap-2">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#059669;fill:none;stroke-width:2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style="font-weight:700;color:#065f46;font-size:0.85rem">Gate Check-In Verified: Stall ${res.spaceId || ''} is now OCCUPIED.</span>
                </div>
            `;
        }
        const checkinBtn = document.getElementById('btn-pass-checkin');
        if (checkinBtn) {
            checkinBtn.disabled = true;
            checkinBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Check-In Completed (Occupied)`;
            checkinBtn.classList.remove('btn-primary');
            checkinBtn.classList.add('btn-ghost');
        }
        if (bookingHoldTimerId) {
            clearInterval(bookingHoldTimerId);
            bookingHoldTimerId = null;
        }
    } catch (err) {
        showToast('error', 'Check-In Notice', err.message);
    }
}

function syncBookingWithCurrentTime() {
    const startInput = document.getElementById('fp-start-time');
    const startDateInput = document.getElementById('fp-start-date');
    if (!startInput || !startDateInput) return;
    
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    startDateInput.value = `${y}-${m}-${d}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    startInput.value = `${hours}:${minutes}`;
    
    setDurationPreset(120); // 2 hours preset
    showToast('info', 'Synchronized with Current Time', `Schedule set starting at current time (${hours}:${minutes}).`);
}

async function openUpdateSpaceModal(reservationId, currentSpaceId) {
    try {
        const spaces = await API.getSpaces();
        const modal = document.getElementById('update-space-modal');
        const body = document.getElementById('update-space-modal-body');
        const confirmBtn = document.getElementById('update-space-modal-confirm');
        if (!modal || !body || !confirmBtn) return;

        const availableSpaces = spaces.filter(s => s.status === 'AVAILABLE' || s.spaceId === currentSpaceId);

        let spaceOptions = availableSpaces.map(s => `
            <option value="${escapeHtml(s.spaceId)}" ${s.spaceId === currentSpaceId ? 'selected disabled' : ''}>
                ${escapeHtml(s.spaceId)} [${escapeHtml(s.lotId)}] — ${escapeHtml(s.type)} ${s.spaceId === currentSpaceId ? '(CURRENTLY ALLOCATED)' : '(AVAILABLE)'}
            </option>
        `).join('');

        body.innerHTML = `
            <div class="mb-3">
                <p style="font-size:0.88rem;color:var(--text-body)">
                    Select a new available stall to reassign for reservation <code class="text-mono">${escapeHtml(reservationId)}</code>.
                </p>
                <div style="background:var(--bg-muted);border:1px solid var(--border-light);border-radius:6px;padding:8px 12px;margin:10px 0;font-size:0.82rem">
                    Current Assigned Bay: <strong class="text-mono" style="color:var(--color-brand-accent)">${escapeHtml(currentSpaceId)}</strong>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label" for="new-space-select">Choose New Parking Space <span class="required">*</span></label>
                <select id="new-space-select" class="form-control" style="font-weight:600">
                    ${spaceOptions}
                </select>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
                    Updating space frees the previous stall and marks the new stall as RESERVED / OCCUPIED.
                </div>
            </div>
            <div id="update-space-modal-error"></div>
        `;

        confirmBtn.onclick = async () => {
            const select = document.getElementById('new-space-select');
            const newSpaceId = select?.value;
            if (!newSpaceId || newSpaceId === currentSpaceId) {
                showToast('warning', 'Selection Required', 'Please choose a different available space.');
                return;
            }

            setButtonLoading(confirmBtn, true);
            try {
                const res = await API.updateBookingSpace(reservationId, newSpaceId);
                showToast('success', 'Space Updated!', `Reservation updated to stall ${newSpaceId}.`);
                closeModal('update-space-modal');

                // If on Find Parking, update pass display
                const passBay = document.querySelector('.pass-bay-value');
                if (passBay) passBay.textContent = newSpaceId;

                // Fast reload active page if bookings
                if (currentPage === 'bookings') {
                    if (window.refreshBookingsData) {
                        await window.refreshBookingsData();
                    } else {
                        await loadBookings();
                    }
                } else if (currentPage === 'parking-layout') {
                    await loadParkingLayout();
                }
            } catch (err) {
                showToast('error', 'Update Failed', err.message);
                const errEl = document.getElementById('update-space-modal-error');
                if (errEl) {
                    errEl.innerHTML = `<div class="alert alert-error mt-2"><div>${escapeHtml(err.message)}</div></div>`;
                }
            } finally {
                setButtonLoading(confirmBtn, false);
            }
        };

        openModal('update-space-modal');
    } catch (err) {
        showToast('error', 'Load Spaces Error', err.message);
    }
}

async function quickBookAlternativeLot(lotId) {
    const prefSelect = document.getElementById('fp-preferred-lot');
    if (prefSelect) {
        prefSelect.value = lotId;
    }
    showToast('info', 'Selecting Facility', `Routing request to ${lotId}...`);
    await handleFindParkingSubmit();
}

// ============================================================
// PARKING LAYOUT MODULE (20 BAYS PER LOT - TOTAL 60 SPACES)
// ============================================================

let layoutCurrentFilter = 'ALL';

async function loadParkingLayout() {
    const container = document.getElementById('parking-layout-content');
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const [lots, spaces] = await Promise.all([
            API.getLots(),
            API.getSpaces()
        ]);

        renderFullFacilityGrid(lots, spaces);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">Unable to load parking grid: ${escapeHtml(err.message)}</div>`;
    }
}

function renderFullFacilityGrid(lots, spaces) {
    const container = document.getElementById('parking-layout-content');
    if (!container) return;

    const availableCount = spaces.filter(s => s.status === 'AVAILABLE').length;
    const reservedCount  = spaces.filter(s => s.status === 'RESERVED').length;
    const occupiedCount  = spaces.filter(s => s.status === 'OCCUPIED').length;

    container.innerHTML = `
        <!-- Dynamic Pricing Tariff Rate Banner -->
        <div class="pricing-rate-banner mb-3" style="margin-top:-0.5rem">
            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                <span style="font-size:0.8rem;font-weight:800;color:var(--text-main);text-transform:uppercase;letter-spacing:0.04em">Dynamic Parking Rates:</span>
                <span class="pricing-rate-pill car">🚗 Passenger Car: ₹50 / hr</span>
                <span class="pricing-rate-pill bike">🏍️ Two-Wheeler: ₹20 / hr</span>
                <span class="pricing-rate-pill" style="background:#ede9fe;border-color:#c4b5fd;color:#5b21b6">♿ Accessible Bays: Rate by Vehicle Type</span>
            </div>
            <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">Calculated strictly on reservation duration</span>
        </div>

        <!-- Top Toolbar & Legend -->
        <div class="card mb-4">
            <div class="card-body" style="padding: 1rem 1.5rem">
                <div class="d-flex justify-between align-center" style="flex-wrap:wrap; gap:1rem">
                    <div class="legend">
                        <div class="legend-item"><div class="legend-dot available"></div> Available (${availableCount})</div>
                        <div class="legend-item"><div class="legend-dot reserved"></div> 20-min Hold (${reservedCount})</div>
                        <div class="legend-item"><div class="legend-dot occupied"></div> Occupied (${occupiedCount})</div>
                        <div style="border-left:1px solid var(--border-light); padding-left:1rem; font-size:0.8rem; color:var(--text-muted)">
                            Total Capacity: <strong>60 Bays</strong> (20 bays per facility)
                        </div>
                    </div>

                    <div class="filter-bar">
                        <button class="filter-btn active" onclick="filterBaysByType('ALL')">All Bays (60)</button>
                        <button class="filter-btn" onclick="filterBaysByType('CAR')">Passenger Car (36 • ₹50/hr)</button>
                        <button class="filter-btn" onclick="filterBaysByType('TWO_WHEELER')">Two-Wheeler (18 • ₹20/hr)</button>
                        <button class="filter-btn" onclick="filterBaysByType('ACCESSIBLE')">Accessible (6)</button>
                        <button class="btn btn-ghost btn-sm" onclick="loadParkingLayout()">
                            <svg viewBox="0 0 24 24" style="width:14px;height:14px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Facilities (LOT-A, LOT-B, LOT-C with 20 Bays each) -->
        <div id="facility-containers-list">
            ${lots.map(lot => renderSingleFacility20Bays(lot, spaces)).join('')}
        </div>
    `;

    window._allSpacesCache = spaces;
}

function renderSingleFacility20Bays(lot, allSpaces) {
    const lotSpaces = allSpaces.filter(s => s.lotId === lot.lotId);

    // Group into 3 clean sectors
    const carSpaces = lotSpaces.filter(s => s.spaceType === 'CAR');
    const bikeSpaces = lotSpaces.filter(s => s.spaceType === 'TWO_WHEELER');
    const accSpaces = lotSpaces.filter(s => s.spaceType === 'ACCESSIBLE');

    const avail = lotSpaces.filter(s => s.status === 'AVAILABLE').length;

    return `
        <div class="lot-container" id="facility-${lot.lotId}">
            <div class="lot-header-card">
                <div class="lot-title-group">
                    <span class="lot-code-chip">${escapeHtml(lot.lotId)}</span>
                    <span class="lot-name-text">${escapeHtml(lot.lotName)}</span>
                    <span class="lot-node-pill">Road Node ${escapeHtml(lot.locationNode)}</span>
                </div>
                <div class="d-flex align-center gap-2">
                    <span class="badge badge-available">${avail} / 20 Bays Free</span>
                </div>
            </div>

            <div class="lot-sectors-wrapper">
                <!-- Sector 1: Standard Vehicle Bays (12 Bays) -->
                <div class="sector-block" data-type="CAR">
                    <div class="sector-title">
                        Sector 1: Standard Passenger Car Bays (${carSpaces.length} Bays • Tariff: ₹50/hr)
                    </div>
                    <div class="parking-slots-grid">
                        ${carSpaces.map(s => renderBayStallCard(s)).join('')}
                    </div>
                </div>

                <!-- Sector 2: Two-Wheeler / Motorbike Bays (6 Bays) -->
                <div class="sector-block" data-type="TWO_WHEELER">
                    <div class="sector-title">
                        Sector 2: Two-Wheeler / Motorbike Bays (${bikeSpaces.length} Bays • Tariff: ₹20/hr)
                    </div>
                    <div class="parking-slots-grid">
                        ${bikeSpaces.map(s => renderBayStallCard(s)).join('')}
                    </div>
                </div>

                <!-- Sector 3: Dedicated Accessible Bays (2 Bays) -->
                <div class="sector-block" data-type="ACCESSIBLE">
                    <div class="sector-title">
                        Sector 3: Priority Accessible Mobility Bays (${accSpaces.length} Bays • Tariff by Vehicle Type)
                    </div>
                    <div class="parking-slots-grid">
                        ${accSpaces.map(s => renderBayStallCard(s)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBayStallCard(space) {
    const statusClass = space.status.toLowerCase();
    const iconSvg = getSpaceTypeIconSvg(space.spaceType);

    return `
        <div class="stall-card ${statusClass}" onclick="openStallDetailModal('${escapeHtml(space.spaceId)}')">
            <div class="stall-status-dot"></div>
            <div class="stall-type-icon">${iconSvg}</div>
            <div class="stall-bay-id">${escapeHtml(space.spaceId)}</div>
            <div class="stall-status-text">${escapeHtml(space.status === 'RESERVED' ? '20m Hold' : space.status)}</div>
        </div>
    `;
}

function filterBaysByType(type) {
    layoutCurrentFilter = type;

    // Toggle filter buttons
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(type) || (type === 'ALL' && btn.textContent.includes('All')));
    });

    // Toggle sectors
    document.querySelectorAll('.sector-block').forEach(sec => {
        if (type === 'ALL') {
            sec.style.display = 'block';
        } else {
            sec.style.display = sec.dataset.type === type ? 'block' : 'none';
        }
    });
}

function openStallDetailModal(spaceId) {
    const space = (window._allSpacesCache || []).find(s => s.spaceId === spaceId);
    if (!space) return;

    const modal = document.getElementById('space-detail-modal');
    const body = document.getElementById('space-modal-body');
    const title = document.getElementById('space-modal-title');

    if (!modal || !body) return;

    const isCar = space.spaceType === 'CAR';
    const isBike = space.spaceType === 'TWO_WHEELER';
    const rateText = isCar ? '₹50 / hr' : (isBike ? '₹20 / hr' : '₹50/hr (Car) / ₹20/hr (Bike)');

    title.textContent = `Bay ${space.spaceId} — Technical Profile & Dynamic Tariff`;
    body.innerHTML = `
        <div style="text-align:center; margin-bottom:1.25rem">
            <div style="width:48px;height:48px;margin:0 auto 0.5rem;display:flex;align-items:center;justify-content:center;background:var(--bg-muted);border-radius:50%">
                ${getSpaceTypeIconSvg(space.spaceType)}
            </div>
            <h3 style="font-size:1.2rem; font-weight:800; font-family:var(--font-mono)">${escapeHtml(space.spaceId)}</h3>
            <div class="badge ${space.status === 'AVAILABLE' ? 'badge-available' : space.status === 'RESERVED' ? 'badge-reserved' : 'badge-occupied'}" style="margin-top:0.35rem">
                ${escapeHtml(space.status)}
            </div>
        </div>

        <table class="pass-detail-table">
            <tr>
                <td>Facility / Lot:</td>
                <td><strong>${escapeHtml(space.lotId)}</strong></td>
            </tr>
            <tr>
                <td>Bay Classification:</td>
                <td>${escapeHtml(space.spaceType)}</td>
            </tr>
            <tr>
                <td>Dynamic Hourly Rate:</td>
                <td><strong class="pricing-rate-pill ${isBike ? 'bike' : 'car'}">${rateText}</strong></td>
            </tr>
            <tr>
                <td>Estimated Duration Fees:</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:0.75rem">
                        <span style="background:var(--bg-muted);padding:2px 7px;border-radius:4px;border:1px solid var(--border-light)">1 hr: <strong>${isBike ? '₹20' : '₹50'}</strong></span>
                        <span style="background:var(--bg-muted);padding:2px 7px;border-radius:4px;border:1px solid var(--border-light)">2 hrs: <strong>${isBike ? '₹40' : '₹100'}</strong></span>
                        <span style="background:var(--bg-muted);padding:2px 7px;border-radius:4px;border:1px solid var(--border-light)">4 hrs: <strong>${isBike ? '₹80' : '₹200'}</strong></span>
                    </div>
                </td>
            </tr>
            <tr>
                <td>Reservation Hold Rule:</td>
                <td>20-Minute Grace Timeout Applied</td>
            </tr>
            <tr>
                <td>Physical Sensor Status:</td>
                <td>${space.isOccupied ? 'Occupied (Barrier Engaged)' : space.isReserved ? 'Reserved (Hold Active)' : 'Clear (Vacant)'}</td>
            </tr>
        </table>

        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" onclick="closeModal('space-detail-modal')">Close</button>
        </div>
    `;

    openModal('space-detail-modal');
}

function getSpaceTypeIconSvg(type) {
    switch (type) {
        case 'TWO_WHEELER':
            return `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2" aria-label="Two Wheeler"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-3 6.5h6l2-4.5h2"/><path d="M12 12.5L9.5 17.5"/></svg>`;
        case 'ACCESSIBLE':
            return `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2" aria-label="Accessible"><circle cx="12" cy="4" r="2"/><path d="M18 19a5 5 0 0 1-9.9-1"/><path d="M9 13h5l1.5 5"/><path d="M9.5 8.5L8 14h5"/></svg>`;
        default:
            return `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2" aria-label="Car"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/></svg>`;
    }
}

// Global exports for inline HTML handlers
window.loadFindParking = loadFindParking;
window.loadParkingLayout = loadParkingLayout;
window.handleFindParkingSubmit = handleFindParkingSubmit;
window.setDurationPreset = setDurationPreset;
window.syncBookingWithCurrentTime = syncBookingWithCurrentTime;
window.openUpdateSpaceModal = openUpdateSpaceModal;
window.quickVerifyCheckIn = quickVerifyCheckIn;
window.quickBookAlternativeLot = quickBookAlternativeLot;
window.filterBaysByType = filterBaysByType;
window.openStallDetailModal = openStallDetailModal;
window.openSpaceDetailModal = openStallDetailModal;
window.onVehicleTypeOrTimeChanged = onVehicleTypeOrTimeChanged;
window.selectDijkstraNode = selectDijkstraNode;
window.updateDijkstraNearbyArea = updateDijkstraNearbyArea;
window.quickSelectLotFromDijkstra = quickSelectLotFromDijkstra;
window.updateLivePricingEstimator = updateLivePricingEstimator;
