/**
 * admin.js — Admin Panel Logic
 *
 * Provides administrative capabilities:
 * - View all reservations with full details
 * - Process expired reservations (triggers backend grace-period engine)
 * - View PriorityQueue waiting list
 * - View all registered vehicles
 * - Monitor parking lot occupancy
 */

let adminSection = 'overview';

async function loadAdmin() {
    const container = document.getElementById('admin-content');
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const [dashboard, queue, vehicles] = await Promise.all([
            API.getDashboard(),
            API.getWaitingQueue(),
            API.getVehicles(),
        ]);
        renderAdminPage(dashboard, queue, vehicles);
    } catch (err) {
        renderApiError('admin-content', err);
    }
}

function renderAdminPage(dashboard, queue, vehicles) {
    const container = document.getElementById('admin-content');
    if (!container) return;

    container.innerHTML = `
        <!-- Admin Info Banner -->
        <div class="alert alert-info mb-5">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
                <strong>Transit Management Authority</strong> — Real-time facility governance, fleet monitoring, and automated reservation management.
                Arrival hold grace period: <strong>20 minutes</strong>.
            </div>
        </div>

        <!-- Admin Tab Nav -->
        <div class="filter-bar mb-5">
            <span style="font-size:var(--font-size-xs); font-weight:600; color:var(--text-muted);">SECTION:</span>
            <button class="filter-btn ${adminSection === 'overview' ? 'active' : ''}" onclick="switchAdminSection('overview')">Overview</button>
            <button class="filter-btn ${adminSection === 'reservations' ? 'active' : ''}" onclick="switchAdminSection('reservations')">All Reservations</button>
            <button class="filter-btn ${adminSection === 'queue' ? 'active' : ''}" onclick="switchAdminSection('queue')">Waiting Queue (${queue.length})</button>
            <button class="filter-btn ${adminSection === 'vehicles' ? 'active' : ''}" onclick="switchAdminSection('vehicles')">Fleet Vehicles (${vehicles.length})</button>
        </div>

        <!-- Content Area -->
        <div id="admin-section-content">
            ${renderAdminSection(adminSection, dashboard, queue, vehicles)}
        </div>
    `;

    window._adminData = { dashboard, queue, vehicles };
}

function switchAdminSection(section) {
    adminSection = section;
    const data = window._adminData || {};
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');

    const contentEl = document.getElementById('admin-section-content');
    if (contentEl && data.dashboard) {
        contentEl.innerHTML = renderAdminSection(section, data.dashboard, data.queue || [], data.vehicles || []);
    }
}

function renderAdminSection(section, dashboard, queue, vehicles) {
    switch (section) {
        case 'overview':      return renderAdminOverview(dashboard);
        case 'reservations':  return renderAdminReservations();
        case 'queue':         return renderAdminQueue(queue);
        case 'vehicles':      return renderAdminVehicles(vehicles);
        default:              return renderAdminOverview(dashboard);
    }
}

// ---- Overview ----
function renderAdminOverview(dashboard) {
    return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:var(--space-5)">
            ${(dashboard.lots || []).map(lot => `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                            ${escapeHtml(lot.lotName)}
                        </div>
                        <span style="font-size:11px; color:var(--color-gray-600)">${escapeHtml(lot.lotId)} · Node ${escapeHtml(lot.locationNode)}</span>
                    </div>
                    <div class="card-body">
                        <div class="occupancy-bar-wrapper mb-3">
                            <div class="d-flex justify-between mb-2">
                                <span class="text-sm">Occupancy</span>
                                <span class="text-sm font-bold">${lot.total > 0 ? Math.round(((lot.occupied+lot.reserved)/lot.total)*100) : 0}%</span>
                            </div>
                            <div class="occupancy-bar-track">
                                <div class="occupancy-bar-fill ${lot.available < 3 ? 'high' : ''}"
                                    style="width:${lot.total > 0 ? Math.round(((lot.occupied+lot.reserved)/lot.total)*100) : 0}%"></div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(4,1fr); text-align:center; gap:var(--space-2)">
                            <div>
                                <div style="font-size:var(--font-size-xl); font-weight:800">${lot.total}</div>
                                <div style="font-size:9px; color:var(--color-gray-600); text-transform:uppercase; font-weight:600">Total</div>
                            </div>
                            <div style="color:#065f46">
                                <div style="font-size:var(--font-size-xl); font-weight:800">${lot.available}</div>
                                <div style="font-size:9px; text-transform:uppercase; font-weight:600">Free</div>
                            </div>
                            <div style="color:#1e40af">
                                <div style="font-size:var(--font-size-xl); font-weight:800">${lot.reserved}</div>
                                <div style="font-size:9px; text-transform:uppercase; font-weight:600">Rsrvd</div>
                            </div>
                            <div style="color:#991b1b">
                                <div style="font-size:var(--font-size-xl); font-weight:800">${lot.occupied}</div>
                                <div style="font-size:9px; text-transform:uppercase; font-weight:600">Occpd</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Process Expired Button -->
        <div class="card mt-5">
            <div class="card-header">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Expiry Management
                </div>
            </div>
            <div class="card-body">
                <p class="text-sm text-muted mb-4">
                    Triggers the Java backend's grace-period expiration engine.
                    Any RESERVED reservations past their start time + 20 minutes grace period will be expired,
                    and the waiting list will be reconsidered.
                </p>
                <div id="expired-result"></div>
                <button class="btn btn-danger" id="process-expired-btn" onclick="processExpiredReservations()">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span class="btn-text">Process Expired Reservations</span>
                </button>
            </div>
        </div>
    `;
}

async function processExpiredReservations() {
    const btn = document.getElementById('process-expired-btn');
    setButtonLoading(btn, true);

    try {
        const result = await API.processExpired();
        const resultEl = document.getElementById('expired-result');
        if (resultEl) {
            if (result.expiredCount === 0) {
                resultEl.innerHTML = `<div class="alert alert-info mb-4">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>No reservations expired at the current time (${window._adminData?.dashboard?.simulatedTimeFormatted}). The system's grace period is 20 minutes past the booking start time.</div>
                </div>`;
            } else {
                resultEl.innerHTML = `<div class="alert alert-success mb-4">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    <div><strong>${result.expiredCount} reservation(s) expired</strong> and parking spaces have been released. Waiting list has been reconsidered.</div>
                </div>`;
            }
        }
        showToast(result.expiredCount > 0 ? 'success' : 'info',
            `${result.expiredCount} Reservations Expired`,
            result.expiredCount > 0 ? 'Spaces released and waiting list updated.' : 'No reservations due for expiry.');
    } catch (err) {
        showToast('error', 'Expiry Processing Failed', err.message);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ---- All Reservations ----
function renderAdminReservations() {
    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                    All Reservations
                </div>
                <button class="btn btn-ghost btn-sm" onclick="refreshAdminReservations()">Refresh</button>
            </div>
            <div id="admin-reservations-body" class="table-container">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    // Auto-load after render
    setTimeout(refreshAdminReservations, 100);
}

async function refreshAdminReservations() {
    const bodyEl = document.getElementById('admin-reservations-body');
    if (!bodyEl) return;
    bodyEl.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const reservations = await API.getReservations();
        if (reservations.length === 0) {
            bodyEl.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><h3>No Reservations</h3><p>No reservations have been created yet.</p></div>`;
            return;
        }

        bodyEl.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Reservation ID</th>
                        <th>Vehicle</th>
                        <th>Owner</th>
                        <th>Type</th>
                        <th>Space / Lot</th>
                        <th>From</th>
                        <th>Until</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reservations.map(r => `
                        <tr>
                            <td data-label="ID"><code style="font-size:11px">${escapeHtml(r.reservationId)}</code></td>
                            <td data-label="Vehicle"><strong>${escapeHtml(r.vehicleId)}</strong></td>
                            <td data-label="Owner">${escapeHtml(r.ownerName)}</td>
                            <td data-label="Type">${getVehicleTypeIcon(r.vehicleType)} ${escapeHtml(r.vehicleType)}</td>
                            <td data-label="Space">${escapeHtml(r.spaceId)} <span class="text-muted text-xs">(${escapeHtml(r.lotId)})</span></td>
                            <td data-label="From">${escapeHtml(r.startTimeFormatted)}</td>
                            <td data-label="Until">${escapeHtml(r.endTimeFormatted)}</td>
                            <td data-label="Status">${getStatusBadge(r.status)}</td>
                            <td data-label="Actions">
                                <div style="display:flex; gap:var(--space-1);">
                                    ${r.status === 'RESERVED' ? `
                                        <button class="btn btn-teal btn-sm" style="font-size:10px" onclick="confirmAction('checkin','${r.reservationId}','${escapeHtml(r.vehicleId)}')">Check In</button>
                                        <button class="btn btn-danger btn-sm" style="font-size:10px" onclick="confirmAction('cancel','${r.reservationId}','')">Cancel</button>
                                    ` : ''}
                                    ${r.status === 'CHECKED_IN' ? `
                                        <button class="btn btn-primary btn-sm" style="font-size:10px" onclick="confirmAction('checkout','${r.reservationId}','')">Check Out</button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        bodyEl.innerHTML = `<div class="alert alert-error m-4"><div>${escapeHtml(err.message)}</div></div>`;
    }
}

// ---- Waiting Queue ----
function renderAdminQueue(queue) {
    if (queue.length === 0) {
        return `<div class="card"><div class="card-body"><div class="empty-state">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h3>Waiting Queue is Empty</h3>
            <p>No drivers are currently waiting. All requests have been allocated or the system is idle.</p>
        </div></div></div>`;
    }

    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    PriorityQueue Waiting List
                </div>
                <span class="badge badge-occupied">${queue.length} waiting</span>
            </div>
            <div class="card-body">
                <div class="alert alert-info mb-4">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>Requests are ranked by: (1) Access Priority (lower = higher), (2) Arrival time, (3) Request ID. The backend automatically re-evaluates this queue when spaces are freed.</div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Request ID</th>
                                <th>Vehicle</th>
                                <th>Type</th>
                                <th>Priority</th>
                                <th>Requested Time</th>
                                <th>Origin Node</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${queue.map((req, i) => `
                                <tr>
                                    <td data-label="Rank"><strong>#${i+1}</strong></td>
                                    <td data-label="Request ID"><code style="font-size:11px">${escapeHtml(req.requestId)}</code></td>
                                    <td data-label="Vehicle"><strong>${escapeHtml(req.vehicleId)}</strong><br><span class="text-xs text-muted">${escapeHtml(req.ownerName)}</span></td>
                                    <td data-label="Type">${getVehicleTypeIcon(req.vehicleType)} ${escapeHtml(req.vehicleType)}</td>
                                    <td data-label="Priority">
                                        <span style="font-size:12px; font-weight:700; color:${req.accessPriority === 1 ? '#991b1b' : '#1e40af'}">
                                            ${req.accessPriority === 1 ? '🔴 HIGH' : '🔵 STANDARD'}
                                        </span>
                                    </td>
                                    <td data-label="Time">${escapeHtml(req.startTimeFormatted)} – ${escapeHtml(req.endTimeFormatted)}</td>
                                    <td data-label="Origin">${escapeHtml(req.originNode)}</td>
                                    <td data-label="Status">${getStatusBadge(req.status)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ---- Vehicles ----
function renderAdminVehicles(vehicles) {
    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    Registered Vehicles (${vehicles.length})
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Vehicle ID</th>
                            <th>Owner</th>
                            <th>Type</th>
                            <th>Accessible Permit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehicles.map(v => `
                            <tr>
                                <td data-label="Vehicle ID"><strong>${escapeHtml(v.vehicleId)}</strong></td>
                                <td data-label="Owner">${escapeHtml(v.ownerName)}</td>
                                <td data-label="Type">${getVehicleTypeIcon(v.vehicleType)} ${escapeHtml(v.vehicleType?.replace('_',' '))}</td>
                                <td data-label="Permit">
                                    ${v.accessiblePermit
                                        ? '<span class="badge badge-checked-in">♿ YES</span>'
                                        : '<span class="badge badge-completed">No</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.loadAdmin = loadAdmin;
window.switchAdminSection = switchAdminSection;
window.processExpiredReservations = processExpiredReservations;
window.refreshAdminReservations = refreshAdminReservations;
