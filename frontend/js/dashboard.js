/**
 * dashboard.js — Live Operations Command Dashboard
 *
 * Real-time monitoring portal for Idam Nagar Urban Mobility & Smart Parking Authority.
 * Fetches actual backend metrics computed by Java ParkingOperationsController & ReservationManager.
 * Automatically polls telemetry every 3 seconds to reflect live 20-minute arrival deadlines,
 * vehicle check-ins, overstays, and slot releases in real time.
 */

let dashboardPollTimer = null;
let isDashboardInitialLoad = true;

/**
 * Loads dashboard telemetry from Java REST API.
 * @param {boolean} silent - If true, avoids wiping the UI with a spinner during periodic polling.
 */
async function loadDashboard(silent = false) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (!silent && isDashboardInitialLoad) {
        container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    }

    try {
        const data = await API.getDashboard();
        renderDashboard(data);
        isDashboardInitialLoad = false;
    } catch (err) {
        // If initial load failed, show error; otherwise don't disrupt an existing live dashboard
        if (!silent || isDashboardInitialLoad) {
            renderApiError('dashboard-content', err);
        }
    }

    // Ensure live 3-second background polling is active while viewing the dashboard
    startDashboardLivePolling();
}

/**
 * Starts automatic 3-second live telemetry refresh.
 */
function startDashboardLivePolling() {
    if (dashboardPollTimer) return;
    dashboardPollTimer = setInterval(() => {
        if (currentPage === 'dashboard') {
            loadDashboard(true);
        } else {
            stopDashboardLivePolling();
        }
    }, 3000);
}

/**
 * Stops live telemetry polling when navigating away.
 */
function stopDashboardLivePolling() {
    if (dashboardPollTimer) {
        clearInterval(dashboardPollTimer);
        dashboardPollTimer = null;
    }
}

/**
 * Renders the complete, high-contrast urban mobility executive dashboard.
 * @param {Object} data - Backend telemetry payload
 */
function renderDashboard(data) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const occupancyPct = data.occupancyPercentage || 0;
    const isHigh = occupancyPct >= 75;
    const isMedium = occupancyPct >= 45 && occupancyPct < 75;
    const fillClass = isHigh ? 'high' : (isMedium ? 'medium' : '');

    const totalSpaces = data.totalSpaces || 0;
    const availableSpaces = data.availableSpaces || 0;
    const reservedSpaces = data.reservedSpaces || 0;
    const occupiedSpaces = data.occupiedSpaces || 0;
    const overstaySpaces = data.overstayReservations || 0;
    const completedSpaces = data.completedReservations || 0;
    const availPct = totalSpaces > 0 ? Math.round((availableSpaces / totalSpaces) * 100) : 0;

    container.innerHTML = `
        <!-- Live Telemetry Status Banner -->
        <div class="live-telemetry-banner">
            <div class="telemetry-indicator">
                <div class="live-pulse-dot" aria-hidden="true"></div>
                <div>
                    <div class="telemetry-title">LIVE TELEMETRY STREAM ACTIVE</div>
                    <div class="telemetry-subtitle">Connected to Java Server Daemon &middot; Auto-polling every 3s</div>
                </div>
            </div>

            <div class="telemetry-controls">
                <div class="clock-quick-advance" title="Quickly advance network simulated time to test 20-min hold expirations and overstays">
                    <span class="clock-quick-label">Advance Clock:</span>
                    <button class="clock-quick-btn" onclick="quickAdvanceClock(15)">+15m</button>
                    <button class="clock-quick-btn" onclick="quickAdvanceClock(20)">+20m</button>
                    <button class="clock-quick-btn" onclick="quickAdvanceClock(60)">+1h</button>
                </div>

                <button class="btn btn-secondary btn-sm" onclick="loadDashboard(false)" title="Force telemetry re-sync">
                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        <!-- 6 Executive KPI Metric Cards -->
        <div class="stats-grid mb-6">

            <!-- Total System Bays -->
            <div class="stat-card" style="--stat-color:#0284c7; --stat-bg:#e0f2fe">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${totalSpaces}</div>
                    <div class="stat-label">Total Bays</div>
                    <div class="stat-sub">Across ${data.lots?.length || 3} facilities (20 bays each)</div>
                </div>
            </div>

            <!-- Available Stalls -->
            <div class="stat-card" style="--stat-color:#10b981; --stat-bg:#d1fae5">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"/>
                        <polyline points="9 12 11 14 15 10"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value" style="color:#065f46">${availableSpaces}</div>
                    <div class="stat-label">Available Now</div>
                    <div class="stat-sub">${availPct}% district capacity free</div>
                </div>
            </div>

            <!-- Active 20-Min Holds (Reserved) -->
            <div class="stat-card" style="--stat-color:#f59e0b; --stat-bg:#fef3c7">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"/>
                        <polyline points="12 7 12 12 15 15"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value" style="color:#92400e">${reservedSpaces}</div>
                    <div class="stat-label">Active Holds</div>
                    <div class="stat-sub">20-min arrival hold window</div>
                </div>
            </div>

            <!-- Occupied Bays -->
            <div class="stat-card" style="--stat-color:#3b82f6; --stat-bg:#dbeafe">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <rect x="2" y="6" width="20" height="12" rx="2"/>
                        <circle cx="7" cy="18" r="2"/>
                        <circle cx="17" cy="18" r="2"/>
                        <path d="M5 6l2-3h10l2 3"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value" style="color:#1e40af">${occupiedSpaces}</div>
                    <div class="stat-label">Parked & Occupied</div>
                    <div class="stat-sub">Physically at facility</div>
                </div>
            </div>

            <!-- Overstay Violations -->
            <div class="stat-card" style="--stat-color:#ef4444; --stat-bg:#fee2e2">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value" style="color:#991b1b">${overstaySpaces}</div>
                    <div class="stat-label">Overstay Violations</div>
                    <div class="stat-sub">Stall held; vehicle overstaying</div>
                </div>
            </div>

            <!-- Overall District Occupancy -->
            <div class="stat-card" style="--stat-color:#6366f1; --stat-bg:#e0e7ff">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${occupancyPct}%</div>
                    <div class="stat-label">District Load</div>
                    <div class="stat-sub">${completedSpaces} sessions completed</div>
                </div>
            </div>

        </div>

        <!-- Occupancy Overview Bar & Quick Navigation Row -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-bottom: 2rem;">

            <!-- Overall Occupancy Breakdown -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24">
                            <line x1="18" y1="20" x2="18" y2="4"/>
                            <line x1="12" y1="20" x2="12" y2="10"/>
                            <line x1="6" y1="20" x2="6" y2="16"/>
                        </svg>
                        District Occupancy Breakdown
                    </div>
                    <span class="badge ${isHigh ? 'badge-occupied' : 'badge-available'}">
                        ${isHigh ? 'High Demand' : (isMedium ? 'Moderate' : 'Optimal')}
                    </span>
                </div>
                <div class="card-body">
                    <div class="occupancy-bar-wrapper mb-4">
                        <div class="d-flex justify-between mb-2">
                            <span class="text-sm font-semibold">Total Utilization Ratio</span>
                            <span class="text-sm font-bold text-mono">${occupancyPct}% Occupied</span>
                        </div>
                        <div class="occupancy-bar-track">
                            <div class="occupancy-bar-fill ${fillClass}" style="width: ${occupancyPct}%"></div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; text-align:center;">
                        <div style="padding:0.75rem; background:#ecfdf5; border-radius:6px; border:1px solid #a7f3d0">
                            <div style="font-size:1.35rem; font-weight:800; color:#065f46" class="text-mono">${availableSpaces}</div>
                            <div style="font-size:0.72rem; color:#065f46; font-weight:700; text-transform:uppercase">Available</div>
                        </div>
                        <div style="padding:0.75rem; background:#fffbeb; border-radius:6px; border:1px solid #fde68a">
                            <div style="font-size:1.35rem; font-weight:800; color:#92400e" class="text-mono">${reservedSpaces}</div>
                            <div style="font-size:0.72rem; color:#92400e; font-weight:700; text-transform:uppercase">Reserved (20m)</div>
                        </div>
                        <div style="padding:0.75rem; background:#eff6ff; border-radius:6px; border:1px solid #bfdbfe">
                            <div style="font-size:1.35rem; font-weight:800; color:#1e40af" class="text-mono">${occupiedSpaces}</div>
                            <div style="font-size:0.72rem; color:#1e40af; font-weight:700; text-transform:uppercase">Occupied</div>
                        </div>
                        <div style="padding:0.75rem; background:#fff1f2; border-radius:6px; border:1px solid #fecdd3">
                            <div style="font-size:1.35rem; font-weight:800; color:#991b1b" class="text-mono">${overstaySpaces}</div>
                            <div style="font-size:0.72rem; color:#991b1b; font-weight:700; text-transform:uppercase">Overstay</div>
                        </div>
                    </div>

                    <div class="legend mt-4">
                        <div class="legend-item"><div class="legend-dot available"></div> Available Bay</div>
                        <div class="legend-item"><div class="legend-dot reserved"></div> 20-min Reservation Hold</div>
                        <div class="legend-item"><div class="legend-dot occupied"></div> Vehicle Parked</div>
                        <div class="legend-item"><div class="legend-dot overstay"></div> Overstay Flagged</div>
                    </div>
                </div>
            </div>

            <!-- Fast Operations Panel -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        Quick Operations
                    </div>
                </div>
                <div class="card-body">
                    <div style="display:flex; flex-direction:column; gap:0.75rem">
                        <button class="btn btn-primary btn-block" onclick="navigateTo('find-parking')">
                            <svg viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <span>Find &amp; Book Parking</span>
                        </button>
                        <button class="btn btn-secondary btn-block" onclick="navigateTo('parking-layout')">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <line x1="3" y1="9" x2="21" y2="9"/>
                                <line x1="9" y1="21" x2="9" y2="9"/>
                            </svg>
                            <span>Inspect 20-Bay Grids</span>
                        </button>
                        <button class="btn btn-secondary btn-block" onclick="navigateTo('bookings')">
                            <svg viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span>Manage All Bookings</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- Facility Capacities (20 Slots Per Area) -->
        <div class="mb-6">
            <div class="section-header">
                <div>
                    <div class="section-title">Municipal Facility Telemetry (20 Bays Each)</div>
                    <div class="section-subtitle">Real-time status across all 3 Idam Nagar facilities (LOT-A, LOT-B, LOT-C)</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('parking-layout')">View Visual Grid &rarr;</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.25rem">
                ${(data.lots || []).map(lot => renderLotCard(lot)).join('')}
            </div>
        </div>

        <!-- Recent Audit & Gate Activity -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg viewBox="0 0 24 24">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Recent Gate &amp; Reservation Activity
                </div>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('bookings')">View All Bookings &rarr;</button>
            </div>
            <div class="table-container">
                ${renderRecentReservationsTable(data.recentReservations || [])}
            </div>
        </div>
    `;
}

/**
 * Renders an individual parking lot summary card with 20-bay progress bar.
 */
function renderLotCard(lot) {
    const total = lot.total || 20;
    const available = lot.available || 0;
    const reserved = lot.reserved || 0;
    const occupied = lot.occupied || 0;
    const availPct = total > 0 ? Math.round((available / total) * 100) : 0;
    const occupiedPct = 100 - availPct;

    const isHigh = availPct < 30;
    const isMedium = availPct >= 30 && availPct < 60;
    const colorBar = isHigh ? '#ef4444' : (isMedium ? '#f59e0b' : '#10b981');

    return `
        <div class="card" style="border-top: 3px solid ${colorBar};">
            <div class="card-body">
                <div class="d-flex justify-between align-center mb-3">
                    <div>
                        <div style="font-weight:700; font-size:1rem; color:var(--text-main); letter-spacing:-0.01em">${escapeHtml(lot.lotName)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono)">${escapeHtml(lot.lotId)} &middot; Junction Node ${escapeHtml(lot.locationNode)}</div>
                    </div>
                    <span class="badge ${isHigh ? 'badge-occupied' : 'badge-available'}">${availPct}% Free</span>
                </div>

                <div class="occupancy-bar-wrapper mb-3">
                    <div class="occupancy-bar-track">
                        <div class="occupancy-bar-fill ${isHigh ? 'high' : (isMedium ? 'medium' : '')}" style="width: ${occupiedPct}%"></div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.5rem; text-align:center; background:var(--bg-muted); padding:0.6rem; border-radius:6px; margin-bottom:1rem">
                    <div>
                        <div style="font-size:1.15rem; font-weight:800; font-family:var(--font-mono)">${total}</div>
                        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Total</div>
                    </div>
                    <div>
                        <div style="font-size:1.15rem; font-weight:800; color:#065f46; font-family:var(--font-mono)">${available}</div>
                        <div style="font-size:0.65rem; color:#065f46; text-transform:uppercase; font-weight:700">Available</div>
                    </div>
                    <div>
                        <div style="font-size:1.15rem; font-weight:800; color:#92400e; font-family:var(--font-mono)">${reserved}</div>
                        <div style="font-size:0.65rem; color:#92400e; text-transform:uppercase; font-weight:700">Reserved</div>
                    </div>
                    <div>
                        <div style="font-size:1.15rem; font-weight:800; color:#1e40af; font-family:var(--font-mono)">${occupied}</div>
                        <div style="font-size:0.65rem; color:#1e40af; text-transform:uppercase; font-weight:700">Occupied</div>
                    </div>
                </div>

                <button class="btn btn-secondary btn-sm btn-block" onclick="navigateTo('parking-layout')">
                    <span>Inspect 20 Bays</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Renders the recent reservations table.
 */
function renderRecentReservationsTable(reservations) {
    if (!reservations || !reservations.length) {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3>No Recent Bookings</h3>
                <p>Reserve a bay from "Find &amp; Book Parking" to see live activity here.</p>
            </div>
        `;
    }

    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Reservation ID</th>
                    <th>Vehicle Plate</th>
                    <th>Stall &amp; Facility</th>
                    <th>Allocated Window</th>
                    <th>Arrival Deadline</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${reservations.map(r => `
                    <tr>
                        <td><code style="font-family:var(--font-mono); font-weight:700; color:var(--color-brand-accent)">${escapeHtml(r.reservationId)}</code></td>
                        <td>
                            <div class="d-flex align-center gap-2">
                                <span class="plate-badge">
                                    <span class="plate-ind">IN</span>
                                    <span class="plate-no">${escapeHtml(r.vehicleId)}</span>
                                </span>
                            </div>
                        </td>
                        <td>
                            <strong>${escapeHtml(r.spaceId)}</strong>
                            <span class="text-muted text-xs">(${escapeHtml(r.lotId)})</span>
                        </td>
                        <td class="text-mono text-sm">${escapeHtml(r.startTimeFormatted || '--')} &ndash; ${escapeHtml(r.endTimeFormatted || '--')}</td>
                        <td class="text-mono text-sm">
                            ${r.status === 'RESERVED' 
                                ? `<span style="color:#d97706; font-weight:700">${escapeHtml(r.expiryDeadlineFormatted || '--')}</span>` 
                                : '<span class="text-muted">&mdash;</span>'}
                        </td>
                        <td>${getStatusBadge(r.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Global expose
window.loadDashboard = loadDashboard;
window.startDashboardLivePolling = startDashboardLivePolling;
window.stopDashboardLivePolling = stopDashboardLivePolling;
