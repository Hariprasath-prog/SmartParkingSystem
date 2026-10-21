/**
 * bookings.js — My Bookings Page Logic
 *
 * Fetches all reservations from the backend.
 * Shows countdown timers based on backend endTime data (visual only).
 * Check-in, Check-out, Cancel operations delegate entirely to backend.
 * Frontend never marks a slot available independently.
 */

let activeBookingFilter = 'ALL';
let allBookings = [];
let currentSimTime = 480;

async function loadBookings(silent = false) {
    const container = document.getElementById('bookings-content');
    if (!container) return;

    if (!silent && !document.getElementById('bookings-list')) {
        container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    }
    clearCountdownIntervals();

    try {
        const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
        const isUserRole = session && session.role !== 'admin';
        const filterParams = (isUserRole && session.vehicleId) ? { vehicleId: session.vehicleId } : {};

        const [reservations, timeData] = await Promise.all([
            API.getReservations(filterParams),
            API.getSimulatedTime().catch(() => ({ simulatedTime: 480 }))
        ]);

        if (isUserRole && session) {
            const userVeh = (session.vehicleId || '').trim().toUpperCase();
            const userName = (session.name || '').trim().toLowerCase();
            allBookings = (reservations || []).filter(r => {
                const rVeh = (r.vehicleId || '').trim().toUpperCase();
                const rOwner = (r.ownerName || '').trim().toLowerCase();
                return (userVeh && rVeh === userVeh) || (userName && rOwner === userName);
            });
        } else {
            allBookings = reservations || [];
        }

        currentSimTime = timeData.simulatedTime || 480;

        const listEl = document.getElementById('bookings-list');
        if (listEl && silent) {
            updateFilterTabsUI();
            filterBookingsDisplay();
        } else {
            renderBookingsPage();
        }
    } catch (err) {
        renderApiError('bookings-content', err);
    }
}

async function refreshBookingsData() {
    return loadBookings(true);
}

function renderBookingsPage() {
    const container = document.getElementById('bookings-content');
    if (!container) return;

    const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
    const isUserRole = session && session.role !== 'admin';

    const counts = {
        ALL:        allBookings.length,
        RESERVED:   allBookings.filter(r => r.status === 'RESERVED').length,
        CHECKED_IN: allBookings.filter(r => r.status === 'CHECKED_IN').length,
        OVERSTAY:   allBookings.filter(r => r.status === 'OVERSTAY').length,
        COMPLETED:  allBookings.filter(r => r.status === 'COMPLETED').length,
        CANCELLED:  allBookings.filter(r => r.status === 'CANCELLED').length,
        EXPIRED:    allBookings.filter(r => r.status === 'EXPIRED').length,
    };

    let userHeaderHtml = '';
    if (isUserRole && session) {
        userHeaderHtml = `
            <div class="user-booking-header-card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem 1.35rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                <div style="display:flex; align-items:center; gap:0.9rem">
                    <div style="width:42px; height:42px; border-radius:10px; background:#ecfdf5; border:1px solid #10b981; display:flex; align-items:center; justify-content:center; color:#059669; font-weight:800; font-size:0.85rem">
                        DRV
                    </div>
                    <div>
                        <div style="font-weight:800; color:var(--text-main); font-size:1.05rem">
                            My Reservations — ${escapeHtml(session.name || session.username)}
                        </div>
                        <div style="font-size:0.82rem; color:var(--text-muted); display:flex; align-items:center; gap:0.6rem; margin-top:2px">
                            <span>Registered Plate:</span>
                            <span style="font-family:var(--font-mono); font-weight:700; color:#047857; background:#dcfce7; padding:1px 7px; border-radius:4px; border:1px solid #a7f3d0">${escapeHtml(session.vehicleId)}</span>
                            <span>&bull;</span>
                            <span>Classification: ${escapeHtml(session.vehicleType || 'CAR')}</span>
                            ${session.accessiblePermit ? '<span class="badge badge-accessible" style="font-size:0.68rem; padding:1px 6px">Accessible Permit</span>' : ''}
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="navigateTo('find-parking')">
                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Book New Parking Space</span>
                </button>
            </div>
        `;
    } else {
        userHeaderHtml = `
            <div class="user-booking-header-card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem 1.35rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                <div style="display:flex; align-items:center; gap:0.9rem">
                    <div style="width:42px; height:42px; border-radius:10px; background:#e0f2fe; border:1px solid #38bdf8; display:flex; align-items:center; justify-content:center; color:#0284c7; font-weight:800; font-size:0.85rem">
                        ADM
                    </div>
                    <div>
                        <div style="font-weight:800; color:var(--text-main); font-size:1.05rem">
                            Municipal Bookings Directory — Managing All Reservations
                        </div>
                        <div style="font-size:0.82rem; color:var(--text-muted); display:flex; align-items:center; gap:0.6rem; margin-top:2px">
                            <span>Authority: <strong>${escapeHtml(session?.name || 'Administrator')}</strong></span>
                            <span>&bull;</span>
                            <span>Scope: <strong>All Facilities (LOT-A, LOT-B, LOT-C)</strong></span>
                            <span>&bull;</span>
                            <span style="color:#0284c7; font-weight:700">Central Directory</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem">
                    <button class="btn btn-secondary btn-sm" onclick="navigateTo('dashboard')">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                        <span>Live Dashboard</span>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="navigateTo('parking-layout')">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                        <span>Parking Bay Grid</span>
                    </button>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        ${userHeaderHtml}

        <!-- Search Bar -->
        <div class="card mb-5">
            <div class="card-body" style="padding:var(--space-4) var(--space-5)">
                <div style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap">
                    <div style="flex:1; min-width:200px; position:relative">
                        <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--color-gray-400);fill:none;stroke-width:2;stroke-linecap:round;pointer-events:none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="booking-search" class="form-control" style="padding-left:2.5rem"
                            placeholder="${isUserRole ? 'Search your reservation ID or stall...' : 'Search by vehicle ID or reservation ID...'}" oninput="filterBookingsDisplay()" />
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="loadBookings()">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round">
                            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-bar mb-5">
            <span style="font-size:var(--font-size-xs); font-weight:600; color:var(--color-gray-600);">FILTER:</span>
            ${[
                ['ALL', 'All', counts.ALL],
                ['RESERVED', 'Reserved (Hold)', counts.RESERVED],
                ['CHECKED_IN', 'Checked In', counts.CHECKED_IN],
                ['OVERSTAY', 'Overstay', counts.OVERSTAY],
                ['COMPLETED', 'Completed', counts.COMPLETED],
                ['CANCELLED', 'Cancelled', counts.CANCELLED],
                ['EXPIRED', 'Expired', counts.EXPIRED],
            ].map(([val, label, count]) => `
                <button class="filter-btn ${activeBookingFilter === val ? 'active' : ''}"
                    onclick="setBookingFilter('${val}')">
                    ${label} <span style="opacity:.7">(${count})</span>
                </button>
            `).join('')}
        </div>

        <!-- Bookings List -->
        <div id="bookings-list">
            ${renderBookingsList(allBookings)}
        </div>
    `;

    // Start countdown timers for active reservations
    startCountdownTimers();
}

function setBookingFilter(status) {
    activeBookingFilter = status;
    updateFilterTabsUI();
    filterBookingsDisplay();
}

function updateFilterTabsUI() {
    const counts = {
        ALL:        allBookings.length,
        RESERVED:   allBookings.filter(r => r.status === 'RESERVED').length,
        CHECKED_IN: allBookings.filter(r => r.status === 'CHECKED_IN').length,
        OVERSTAY:   allBookings.filter(r => r.status === 'OVERSTAY').length,
        COMPLETED:  allBookings.filter(r => r.status === 'COMPLETED').length,
        CANCELLED:  allBookings.filter(r => r.status === 'CANCELLED').length,
        EXPIRED:    allBookings.filter(r => r.status === 'EXPIRED').length,
    };

    const filterBar = document.querySelector('.filter-bar');
    if (!filterBar) return;

    filterBar.innerHTML = `
        <span style="font-size:var(--font-size-xs); font-weight:600; color:var(--color-gray-600);">FILTER:</span>
        ${[
            ['ALL', 'All', counts.ALL],
            ['RESERVED', 'Reserved (Hold)', counts.RESERVED],
            ['CHECKED_IN', 'Checked In', counts.CHECKED_IN],
            ['OVERSTAY', 'Overstay', counts.OVERSTAY],
            ['COMPLETED', 'Completed', counts.COMPLETED],
            ['CANCELLED', 'Cancelled', counts.CANCELLED],
            ['EXPIRED', 'Expired', counts.EXPIRED],
        ].map(([val, label, count]) => `
            <button class="filter-btn ${activeBookingFilter === val ? 'active' : ''}"
                onclick="setBookingFilter('${val}')">
                ${label} <span style="opacity:.7">(${count})</span>
            </button>
        `).join('')}
    `;
}

function filterBookingsDisplay() {
    const query = document.getElementById('booking-search')?.value?.toLowerCase() || '';
    const filtered = allBookings.filter(r => {
        if (activeBookingFilter !== 'ALL' && r.status !== activeBookingFilter) return false;
        if (query) {
            return r.vehicleId?.toLowerCase().includes(query)
                || r.reservationId?.toLowerCase().includes(query)
                || r.ownerName?.toLowerCase().includes(query);
        }
        return true;
    });

    const listEl = document.getElementById('bookings-list');
    if (listEl) listEl.innerHTML = renderBookingsList(filtered);
    startCountdownTimers();
}

function renderBookingsList(reservations) {
    const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
    const isUserRole = session && session.role !== 'admin';

    const filtered = reservations.filter(r =>
        activeBookingFilter === 'ALL' || r.status === activeBookingFilter
    );

    if (filtered.length === 0) {
        let emptyMsg = 'No reservations have been made yet.';
        if (isUserRole && session && session.vehicleId) {
            emptyMsg = activeBookingFilter === 'ALL'
                ? `No reservations found for your registered vehicle (<strong>${escapeHtml(session.vehicleId)}</strong>).`
                : `No ${activeBookingFilter.replace('_', ' ').toLowerCase()} reservations found for vehicle <strong>${escapeHtml(session.vehicleId)}</strong>.`;
        } else if (activeBookingFilter !== 'ALL') {
            emptyMsg = `No ${activeBookingFilter.replace('_', ' ').toLowerCase()} reservations found.`;
        }

        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>No Bookings Found</h3>
                <p>${emptyMsg}</p>
                <button class="btn btn-primary mt-4" onclick="navigateTo('find-parking')">Book a Parking Bay</button>
            </div>
        `;
    }

    return `
        <div style="display:flex; flex-direction:column; gap:var(--space-4)">
            ${filtered.map(r => renderBookingCard(r)).join('')}
        </div>
    `;
}

function renderBookingCard(r) {
    const duration = formatDuration(r.startTime || 0, r.endTime || 0);
    const remaining = getRemainingTime(r.endTime || 0, currentSimTime);
    const isActive = r.status === 'RESERVED' || r.status === 'CHECKED_IN';
    const canCheckIn  = r.status === 'RESERVED';
    const canCheckOut = r.status === 'CHECKED_IN' || r.status === 'OVERSTAY' || r.status === 'RESERVED';
    const canCancel   = r.status === 'RESERVED';

    return `
        <div class="card fade-in" id="booking-card-${r.reservationId}" style="border-left: 4px solid ${getStatusColor(r.status)}">
            <div class="card-body">
                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap">

                    <!-- Left: Core Info -->
                    <div style="flex:1; min-width:260px">
                        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-3); flex-wrap:wrap">
                            <div>${getVehicleTypeIcon(r.vehicleType)}</div>
                            <div>
                                <div style="font-weight:700; font-size:var(--font-size-base); color:var(--text-main)">
                                    ${escapeHtml(r.vehicleId)}
                                </div>
                                <div style="font-size:var(--font-size-xs); color:var(--text-muted)">${escapeHtml(r.ownerName)}</div>
                            </div>
                            <span class="pricing-rate-pill ${r.vehicleType === 'TWO_WHEELER' ? 'bike' : 'car'}" style="font-size:0.72rem; padding:1px 7px">
                                ${escapeHtml(r.hourlyRateFormatted || (r.vehicleType === 'TWO_WHEELER' ? '₹20/hr' : '₹50/hr'))}
                            </span>
                            ${r.accessiblePermit ? '<span style="font-size:var(--font-size-xs); background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:999px; font-weight:600">Accessible Permit</span>' : ''}
                            ${getStatusBadge(r.status)}
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:var(--space-2)">
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Reservation Reference</span><br>
                                <code style="font-size:11px">${escapeHtml(r.reservationId)}</code>
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Assigned Bay / Facility</span><br>
                                <span style="color:var(--text-main); font-weight:700">${escapeHtml(r.spaceId)}</span>
                                <span> (${escapeHtml(r.lotId)})</span>
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Classification &amp; Rate</span><br>
                                <span>${r.vehicleType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Car'} (${escapeHtml(r.hourlyRateFormatted || (r.vehicleType === 'TWO_WHEELER' ? '₹20/hr' : '₹50/hr'))})</span>
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Scheduled Duration</span><br>
                                ${duration}
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Total Parking Fee (Zero GST)</span><br>
                                <strong style="color:#047857; font-size:0.92rem">${escapeHtml(r.formattedCost || (r.totalCost ? '₹' + Math.round(r.totalCost) : (r.vehicleType === 'TWO_WHEELER' ? '₹40' : '₹100')))}</strong>
                                <span style="font-size:0.75rem; color:#059669; font-weight:600; margin-left:4px">• Pure Space Fee</span>
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Stall Type</span><br>
                                ${escapeHtml(r.spaceType?.replace('_',' '))}
                            </div>
                        </div>
                    </div>

                    <!-- Right: Time & Actions -->
                    <div style="display:flex; flex-direction:column; gap:var(--space-3); min-width:200px; align-items:flex-end">

                        <!-- Time Range -->
                        <div style="text-align:right">
                            <div style="font-size:var(--font-size-sm); font-weight:700; color:var(--text-main)">
                                ${escapeHtml(r.startTimeFormatted)} – ${escapeHtml(r.endTimeFormatted)}
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                Scheduled time interval
                            </div>
                        </div>

                        <!-- 20-Minute Hold Window for RESERVED slots -->
                        ${r.status === 'RESERVED' ? `
                            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:6px 10px; font-size:0.75rem; color:#92400e; text-align:right">
                                <strong>20-Minute Arrival Check-In Window:</strong><br>
                                Arrive up to 20m early (or before ${minutesToTime(r.expiryDeadline || ((r.startTime || 0) + 20))}) to check in &amp; update space to OCCUPIED.
                            </div>
                        ` : ''}

                        <!-- Overstay Notice -->
                        ${r.status === 'OVERSTAY' ? `
                            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:6px 10px; font-size:0.75rem; color:#be123c; text-align:right">
                                <strong>Overstay Flagged:</strong><br>
                                Exceeded session end time (${escapeHtml(r.endTimeFormatted)}). Space remains occupied until gate checkout.
                            </div>
                        ` : ''}

                        <!-- Expired Timeout Notice & Suggestion Action -->
                        ${r.status === 'EXPIRED' ? `
                            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:6px 10px; font-size:0.75rem; color:#991b1b; text-align:right">
                                Timed out (20-min window exceeded). Hold released.<br>
                                <button class="btn btn-secondary btn-sm mt-2" onclick="navigateTo('find-parking')">
                                    Book Nearby Bay (Dijkstra)
                                </button>
                            </div>
                        ` : ''}

                        <!-- Countdown Timer for Checked-In / Active Slot -->
                        ${isActive ? `
                            <div class="countdown-timer ${remaining.status}"
                                 id="countdown-${r.reservationId}"
                                 data-endtime="${r.endTime}">
                                <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span id="countdown-text-${r.reservationId}">${remaining.text}</span>
                            </div>
                        ` : ''}

                        <!-- Action Buttons -->
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:flex-end">
                            ${canCheckIn ? `
                                <button class="btn btn-primary btn-sm"
                                    onclick="confirmAction('checkin', '${r.reservationId}', '${escapeHtml(r.vehicleId)}')">
                                    <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                    Verify Gate Check-In
                                </button>
                            ` : ''}
                            ${isActive ? `
                                <button class="btn btn-secondary btn-sm"
                                    onclick="openUpdateSpaceModal('${r.reservationId}', '${escapeHtml(r.spaceId)}')">
                                    <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    Update Parking Space
                                </button>
                            ` : ''}
                            ${canCheckOut ? `
                                <button class="btn btn-primary btn-sm"
                                    onclick="confirmAction('checkout', '${r.reservationId}', '')">
                                    <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                    Gate Check-Out &amp; Depart
                                </button>
                            ` : ''}
                            ${canCancel ? `
                                <button class="btn btn-ghost btn-sm"
                                    onclick="confirmAction('cancel', '${r.reservationId}', '')">
                                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getStatusColor(status) {
    const map = {
        AVAILABLE:  '#10b981',
        RESERVED:   '#f59e0b',
        OCCUPIED:   '#ef4444',
        CHECKED_IN: '#0284c7',
        OVERSTAY:   '#be123c',
        COMPLETED:  '#64748b',
        CANCELLED:  '#94a3b8',
        EXPIRED:    '#71717a',
    };
    return map[status] || '#d1d5db';
}

// ============================================================
// COUNTDOWN TIMERS
// Visual only — backend is responsible for actual expiry
// ============================================================

function startCountdownTimers() {
    clearCountdownIntervals();

    const timers = document.querySelectorAll('.countdown-timer[data-endtime]');
    timers.forEach(timer => {
        const endTime = parseInt(timer.getAttribute('data-endtime'));
        const resId = timer.id.replace('countdown-', '');
        const textEl = document.getElementById(`countdown-text-${resId}`);

        if (!textEl) return;

        const updateTimer = () => {
            const remaining = getRemainingTime(endTime, currentSimTime);
            textEl.textContent = remaining.text;
            timer.className = `countdown-timer ${remaining.status}`;
        };

        updateTimer();
        // Update every 60 seconds (simulated time doesn't advance in real-time)
        const intervalId = setInterval(updateTimer, 60000);
        countdownIntervals.push(intervalId);
    });
}

// ============================================================
// BOOKING ACTIONS (Check-in, Check-out, Cancel)
// All delegate to backend — never assume success locally
// ============================================================

function confirmAction(action, reservationId, vehicleId) {
    const labels = {
        checkin: {
            title: 'Verify Gate Check-In',
            text: 'Verify vehicle arrival at the barrier gate. The parking stall status will change to <strong>OCCUPIED</strong>.',
            btn: 'Confirm Check-In',
            badgeBg: '#dcfce7',
            badgeColor: '#16a34a',
            cls: 'btn-primary',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
        },
        checkout: {
            title: 'Gate Check-Out & Depart',
            text: 'Confirm vehicle departure at the gate barrier. The parking stall will be released immediately and updated to <strong>AVAILABLE</strong>.',
            btn: 'Complete Check-Out',
            badgeBg: '#e0f2fe',
            badgeColor: '#0284c7',
            cls: 'btn-primary',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
        },
        cancel: {
            title: 'Cancel Reservation',
            text: 'Are you sure you want to cancel this reservation? The held space will be released immediately back to available stalls.',
            btn: 'Cancel Reservation',
            badgeBg: '#fee2e2',
            badgeColor: '#dc2626',
            cls: 'btn-danger',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
        },
    };

    const info = labels[action];
    if (!info) return;

    const resObj = (allBookings || []).find(b => b.reservationId === reservationId);
    const feeRowHtml = resObj ? `
        <div style="background:var(--bg-muted);border:1px solid var(--border-light);border-radius:6px;padding:8px 12px;margin:10px 0;font-size:0.8rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
                <span>Tariff (${resObj.vehicleType === 'TWO_WHEELER' ? '🏍️ Two-Wheeler' : '🚗 Car'}): </span>
                <strong>${escapeHtml(resObj.hourlyRateFormatted || (resObj.vehicleType === 'TWO_WHEELER' ? '₹20/hr' : '₹50/hr'))}</strong>
            </div>
            <div>
                <span>Total Parking Fee: </span>
                <strong style="color:#047857;font-size:0.92rem">${escapeHtml(resObj.formattedCost || (resObj.totalCost ? '₹' + Math.round(resObj.totalCost) : '₹100'))}</strong>
                <span style="font-size:0.72rem;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:4px;font-weight:600;margin-left:4px">Zero GST</span>
            </div>
        </div>
    ` : '';

    document.getElementById('action-modal-title').textContent = info.title;
    document.getElementById('action-modal-body').innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:1.25rem">
            <div style="width:48px;height:48px;border-radius:50%;background:${info.badgeBg};color:${info.badgeColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${info.icon}
            </div>
            <div style="flex:1">
                <p style="font-size:var(--font-size-sm);color:var(--text-main);margin:0 0 6px 0;line-height:1.45">${info.text}</p>
                <div style="font-size:var(--font-size-xs);color:var(--text-muted)">
                    Reservation Reference: <code style="font-weight:700">${escapeHtml(reservationId)}</code>
                </div>
                ${feeRowHtml}
            </div>
        </div>
        <div id="action-modal-result"></div>
    `;

    const confirmBtn = document.getElementById('action-modal-confirm');
    confirmBtn.textContent = info.btn;
    confirmBtn.className = `btn ${info.cls}`;

    confirmBtn.onclick = async () => {
        setButtonLoading(confirmBtn, true);
        try {
            let result;
            if (action === 'checkin') {
                result = await API.checkIn(reservationId, vehicleId || null);
            } else if (action === 'checkout') {
                result = await API.checkOut(reservationId);
            } else if (action === 'cancel') {
                result = await API.cancelReservation(reservationId);
            }

            const successMsg = action === 'checkout'
                ? `Gate check-out confirmed! Stall released to AVAILABLE.`
                : (action === 'checkin'
                    ? `Gate check-in verified! Stall is now OCCUPIED.`
                    : `Reservation ${reservationId} cancelled.`);

            showToast('success', info.title, successMsg);
            closeModal('booking-action-modal');
            // Instant in-place refresh
            await refreshBookingsData();

        } catch (err) {
            const resultEl = document.getElementById('action-modal-result');
            if (resultEl) {
                resultEl.innerHTML = `
                    <div class="alert alert-error">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div><strong>Operation Notice</strong><div>${escapeHtml(err.message)}</div></div>
                    </div>
                `;
            }
            showToast('error', 'Action Notice', err.message);
        } finally {
            setButtonLoading(confirmBtn, false);
        }
    };

    openModal('booking-action-modal');
}

window.loadBookings = loadBookings;
window.refreshBookingsData = refreshBookingsData;
window.setBookingFilter = setBookingFilter;
window.filterBookingsDisplay = filterBookingsDisplay;
window.confirmAction = confirmAction;
