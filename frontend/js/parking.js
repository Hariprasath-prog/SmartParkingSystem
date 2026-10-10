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

    // Compute intelligent initial defaults matching the simulated network clock
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

            <!-- LEFT: Search & Booking Configuration -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Vehicle Details &amp; Parking Window
                    </div>
                    <span class="badge badge-available">Live Dijkstra Routing</span>
                </div>
                <div class="card-body">

                    <!-- 20-Minute Hold Policy Notice -->
                    <div class="timeout-notice-box">
                        <div class="timeout-notice-icon">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="timeout-notice-content">
                            <h4>20-Minute Arrival Hold Rule</h4>
                            <p>Allocated reservations are reserved for <strong>20 minutes</strong> from arrival time. Check in at the entrance gate within 20 mins to secure your bay; otherwise, the system automatically times out the hold and reallocates the space to waiting drivers.</p>
                        </div>
                    </div>

                    <form id="find-parking-form" novalidate>

                        <!-- Vehicle Registration -->
                        <div class="form-group">
                            <label class="form-label" for="fp-vehicle-id">
                                Vehicle Registration Number <span class="required">*</span>
                            </label>
                            <input type="text" id="fp-vehicle-id" class="form-control text-mono"
                                placeholder="e.g. TN-01-AB-1234" value="TN-01-AB-1234"
                                autocomplete="off" required style="font-weight:700; text-transform:uppercase"
                            />
                            <div class="form-error" id="fp-vehicle-id-error">Please enter a valid vehicle registration plate.</div>
                        </div>

                        <!-- Driver Name -->
                        <div class="form-group">
                            <label class="form-label" for="fp-owner-name">Driver / Owner Name</label>
                            <input type="text" id="fp-owner-name" class="form-control"
                                placeholder="e.g. Anand Kumar" value="Anand Kumar" />
                        </div>

                        <!-- Vehicle Type & Origin Location Row -->
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="fp-vehicle-type">
                                    Vehicle Classification <span class="required">*</span>
                                </label>
                                <select id="fp-vehicle-type" class="form-control" required>
                                    <option value="CAR" selected>Standard Passenger Car (4-Wheeler)</option>
                                    <option value="TWO_WHEELER">Two-Wheeler (Motorbike / Scooter)</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="origin-node">
                                    Current Location / Entry Node <span class="required">*</span>
                                </label>
                                <select id="origin-node" class="form-control">
                                    ${nodeOptions}
                                </select>
                            </div>
                        </div>

                        <!-- Accessibility Permit Option -->
                        <div class="form-group">
                            <label class="d-flex align-center gap-2" style="cursor:pointer">
                                <input type="checkbox" id="fp-accessible" style="width:16px;height:16px" />
                                <span style="font-size:0.85rem; font-weight:600; color:var(--text-main)">
                                    Authorized Accessible / Disability Mobility Permit
                                </span>
                            </label>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px; margin-left:24px">
                                Allocates dedicated high-priority accessible stalls closest to building entrances.
                            </div>
                        </div>

                        <!-- Parking Preferences: Preferred Lot & Max Distance -->
                        <div class="form-row">
                            <div class="form-group">
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

                            <div class="form-group">
                                <label class="form-label" for="fp-max-distance">
                                    Max Acceptable Transit Distance
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

                        <!-- Parking Date & Time Controls (Section 5 Required Format) -->
                        <div class="card mb-4" style="background:var(--bg-muted); border:1px solid var(--border-light); padding:1rem">
                            <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.75rem; letter-spacing:0.05em">
                                Parking Interval Schedule
                            </div>

                            <!-- Parking From: Date + Time -->
                            <div class="form-row mb-3">
                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-start-date">
                                        Parking From (Date) <span class="required">*</span>
                                    </label>
                                    <input type="date" id="fp-start-date" class="form-control text-mono"
                                        value="${todayStr}" min="${todayStr}" required />
                                    <div class="form-error" id="fp-start-date-error">Start date cannot be in the past.</div>
                                </div>

                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-start-time">
                                        Parking From (Time) <span class="required">*</span>
                                    </label>
                                    <input type="time" id="fp-start-time" class="form-control text-mono"
                                        value="${startTimeStr}" required />
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
                                        value="${endDateStr}" min="${todayStr}" required />
                                    <div class="form-error" id="fp-end-date-error">End date cannot precede start date.</div>
                                </div>

                                <div class="form-group" style="margin-bottom:0">
                                    <label class="form-label" for="fp-end-time">
                                        Parking Until (Time) <span class="required">*</span>
                                    </label>
                                    <input type="time" id="fp-end-time" class="form-control text-mono"
                                        value="${endTimeStr}" required />
                                    <div class="form-error" id="fp-end-time-error">End time must be after start time.</div>
                                </div>
                            </div>

                            <!-- Quick Preset Duration Pills -->
                            <div class="duration-pills mt-3">
                                <span style="font-size:0.72rem; color:var(--text-muted); align-self:center; font-weight:600">Quick Duration:</span>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(30)">+30m</button>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(60)">+1 hr</button>
                                <button type="button" class="duration-pill active" onclick="setDurationPreset(120)">+2 hrs</button>
                                <button type="button" class="duration-pill" onclick="setDurationPreset(240)">+4 hrs</button>
                            </div>
                        </div>

                        <div id="find-parking-alert"></div>

                        <button type="submit" id="find-parking-btn" class="btn btn-primary btn-block btn-lg">
                            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <span class="btn-text">Compute Nearest Stall &amp; Reserve</span>
                        </button>
                    </form>
                </div>
            </div>

            <!-- RIGHT: Active Pass & Live Dijkstra Alternative Recommendations -->
            <div id="booking-result-panel">
                <div class="card" style="border: 2px dashed var(--border-medium); text-align:center; padding: 3rem 2rem;">
                    <svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:var(--text-subtle);fill:none;stroke-width:1.5;margin:0 auto 1rem">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-main)">No Active Allocation Query</h3>
                    <p style="font-size:0.85rem; color:var(--text-muted); max-width:360px; margin:0.5rem auto 0">
                        Enter your vehicle plate number and arrival time. The system will evaluate all 3 facilities (20 bays each) using Dijkstra shortest path routing and provide real-time alternatives.
                    </p>
                </div>
            </div>

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
    const vehicleId = document.getElementById('fp-vehicle-id')?.value.trim().toUpperCase();
    const ownerName = document.getElementById('fp-owner-name')?.value.trim() || 'Driver';
    const vehicleType = document.getElementById('fp-vehicle-type')?.value;
    const accessible = document.getElementById('fp-accessible')?.checked;
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
        // Success: Render Digital Pass with 20-min countdown timer
        panel.innerHTML = `
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
                            <td>Valid Interval:</td>
                            <td>${escapeHtml(result.startTimeFormatted)} — ${escapeHtml(result.endTimeFormatted)}</td>
                        </tr>
                        <tr>
                            <td>Permitted Stall Type:</td>
                            <td>${escapeHtml(result.spaceType)} Stall</td>
                        </tr>
                    </table>

                    <!-- Immediate Gate Verification Action -->
                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-primary btn-block" onclick="quickVerifyCheckIn('${escapeHtml(result.reservationId)}', '${escapeHtml(result.vehicleId)}')">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            Confirm Gate Check-In (Arrival)
                        </button>
                    </div>

                    <!-- Suggested Alternative Nearby Slots (Section 7) -->
                    ${renderNearbySuggestionsHtml(result.suggestions, result.lotId)}
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
                Recommended Alternative Parking (Dijkstra Distance &amp; Timing)
            </div>
            <div class="nearby-list">
                ${alternatives.map(s => `
                    <div class="nearby-item">
                        <div class="nearby-lot-meta">
                            <h5>${escapeHtml(s.lotName)} <span class="text-mono text-muted text-sm">(${escapeHtml(s.lotId)})</span></h5>
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
                            Book This Slot
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
        await API.checkIn(resId, vehicleId);
        showToast('success', 'Checked In!', `Arrival verified at gate. Barrier gate opened.`);
        navigateTo('bookings');
    } catch (err) {
        showToast('error', 'Check-In Error', err.message);
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
                        <button class="filter-btn" onclick="filterBaysByType('CAR')">Passenger Car (36)</button>
                        <button class="filter-btn" onclick="filterBaysByType('TWO_WHEELER')">Two-Wheeler (18)</button>
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
                        Sector 1: Standard Passenger Car Bays (${carSpaces.length} Bays)
                    </div>
                    <div class="parking-slots-grid">
                        ${carSpaces.map(s => renderBayStallCard(s)).join('')}
                    </div>
                </div>

                <!-- Sector 2: Two-Wheeler / Motorbike Bays (6 Bays) -->
                <div class="sector-block" data-type="TWO_WHEELER">
                    <div class="sector-title">
                        Sector 2: Two-Wheeler / Motorbike Bays (${bikeSpaces.length} Bays)
                    </div>
                    <div class="parking-slots-grid">
                        ${bikeSpaces.map(s => renderBayStallCard(s)).join('')}
                    </div>
                </div>

                <!-- Sector 3: Dedicated Accessible Bays (2 Bays) -->
                <div class="sector-block" data-type="ACCESSIBLE">
                    <div class="sector-title">
                        Sector 3: Priority Accessible Mobility Bays (${accSpaces.length} Bays)
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

    title.textContent = `Bay ${space.spaceId} — Technical Profile`;
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
