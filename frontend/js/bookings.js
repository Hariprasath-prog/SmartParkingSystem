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

async function loadBookings() {
    const container = document.getElementById('bookings-content');
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    clearCountdownIntervals();

    try {
        const [reservations, timeData] = await Promise.all([
            API.getReservations(),
            API.getSimulatedTime().catch(() => ({ simulatedTime: 480 }))
        ]);
        allBookings = reservations;
        currentSimTime = timeData.simulatedTime || 480;
        renderBookingsPage();
    } catch (err) {
        renderApiError('bookings-content', err);
    }
}

function renderBookingsPage() {
    const container = document.getElementById('bookings-content');
    if (!container) return;

    const counts = {
        ALL:        allBookings.length,
        RESERVED:   allBookings.filter(r => r.status === 'RESERVED').length,
        CHECKED_IN: allBookings.filter(r => r.status === 'CHECKED_IN').length,
        OVERSTAY:   allBookings.filter(r => r.status === 'OVERSTAY').length,
        COMPLETED:  allBookings.filter(r => r.status === 'COMPLETED').length,
        CANCELLED:  allBookings.filter(r => r.status === 'CANCELLED').length,
        EXPIRED:    allBookings.filter(r => r.status === 'EXPIRED').length,
    };

    container.innerHTML = `
        <!-- Search Bar -->
        <div class="card mb-5">
            <div class="card-body" style="padding:var(--space-4) var(--space-5)">
                <div style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap">
                    <div style="flex:1; min-width:200px; position:relative">
                        <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--color-gray-400);fill:none;stroke-width:2;stroke-linecap:round;pointer-events:none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="booking-search" class="form-control" style="padding-left:2.5rem"
                            placeholder="Search by vehicle ID or reservation ID..." oninput="filterBookingsDisplay()" />
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

        <!-- Confirm Action Modal -->
        <div class="modal-overlay" id="booking-action-modal">
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title" id="action-modal-title">Confirm Action</div>
                    <button class="modal-close" onclick="closeModal('booking-action-modal')">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body" id="action-modal-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="closeModal('booking-action-modal')">Cancel</button>
                    <button class="btn btn-primary" id="action-modal-confirm">Confirm</button>
                </div>
            </div>
        </div>
    `;

    // Start countdown timers for active reservations
    startCountdownTimers();
}

function setBookingFilter(status) {
    activeBookingFilter = status;
    // Re-render
    renderBookingsPage();
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
    const filtered = reservations.filter(r =>
        activeBookingFilter === 'ALL' || r.status === activeBookingFilter
    );

    if (filtered.length === 0) {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>No Bookings Found</h3>
                <p>${activeBookingFilter === 'ALL'
                    ? 'No reservations have been made yet.'
                    : `No ${activeBookingFilter.replace('_', ' ').toLowerCase()} reservations found.`}</p>
                <button class="btn btn-primary mt-4" onclick="navigateTo('find-parking')">Find Parking</button>
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
    const canCheckOut = r.status === 'CHECKED_IN' || r.status === 'OVERSTAY';
    const canCancel   = r.status === 'RESERVED';

    return `
        <div class="card fade-in" id="booking-card-${r.reservationId}" style="border-left: 4px solid ${getStatusColor(r.status)}">
            <div class="card-body">
                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap">

                    <!-- Left: Core Info -->
                    <div style="flex:1; min-width:260px">
                        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-3)">
                            <div>${getVehicleTypeIcon(r.vehicleType)}</div>
                            <div>
                                <div style="font-weight:700; font-size:var(--font-size-base); color:var(--text-main)">
                                    ${escapeHtml(r.vehicleId)}
                                </div>
                                <div style="font-size:var(--font-size-xs); color:var(--text-muted)">${escapeHtml(r.ownerName)}</div>
                            </div>
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
                                <span style="font-weight:600">Stall Type</span><br>
                                ${escapeHtml(r.spaceType?.replace('_',' '))}
                            </div>
                            <div style="font-size:var(--font-size-xs); color:var(--text-muted)">
                                <span style="font-weight:600">Scheduled Duration</span><br>
                                ${duration}
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
                                <strong>20-Minute Gate Check-In Window:</strong><br>
                                Arrive before ${minutesToTime(r.expiryDeadline || ((r.startTime || 0) + 20))}
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
        checkin:  { title: 'Confirm Check-In',  text: 'Are you sure you want to check in?<br>The space status will change to OCCUPIED.', btn: 'Check In', cls: 'btn-teal' },
        checkout: { title: 'Confirm Check-Out', text: 'Are you sure you want to check out?<br>The parking space will be released and marked AVAILABLE.', btn: 'Check Out', cls: 'btn-primary' },
        cancel:   { title: 'Cancel Reservation', text: 'Are you sure you want to cancel this reservation?<br>The space will be released and you will be removed from the queue.', btn: 'Cancel Reservation', cls: 'btn-danger' },
    };

    const info = labels[action];
    if (!info) return;

    document.getElementById('action-modal-title').textContent = info.title;
    document.getElementById('action-modal-body').innerHTML = `
        <div class="d-flex align-center gap-3 mb-4">
            <div style="width:44px;height:44px;background:var(--color-primary-light);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:var(--color-primary);fill:none;stroke-width:2;stroke-linecap:round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <div>
                <p style="font-size:var(--font-size-sm)">${info.text}</p>
                <p style="font-size:var(--font-size-xs);color:var(--color-gray-600);margin-top:6px">
                    Reservation: <code>${escapeHtml(reservationId)}</code>
                </p>
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

            showToast('success', 'Action Successful', result.message || 'Operation completed.');
            closeModal('booking-action-modal');
            // Reload bookings to reflect backend state
            await loadBookings();

        } catch (err) {
            const resultEl = document.getElementById('action-modal-result');
            if (resultEl) {
                resultEl.innerHTML = `
                    <div class="alert alert-error">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div><strong>Action Failed</strong><div>${escapeHtml(err.message)}</div></div>
                    </div>
                `;
            }
            showToast('error', 'Action Failed', err.message);
        } finally {
            setButtonLoading(confirmBtn, false);
        }
    };

    openModal('booking-action-modal');
}

window.loadBookings = loadBookings;
window.setBookingFilter = setBookingFilter;
window.filterBookingsDisplay = filterBookingsDisplay;
window.confirmAction = confirmAction;
