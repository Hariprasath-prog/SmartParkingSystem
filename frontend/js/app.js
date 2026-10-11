/**
 * app.js — Application Shell & Navigation Controller
 *
 * Manages:
 * - Sidebar navigation
 * - Page routing (SPA-like)
 * - Mobile sidebar toggle
 * - Toast notification system
 * - Modal system
 * - Global loading state
 * - Simulated time display refresh
 */

// ============================================================
// STATE
// ============================================================
let currentPage = 'dashboard';
let simulatedTime = { minutes: 480, formatted: '08:00' };
let countdownIntervals = [];

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileSidebar();
    initToastSystem();
    navigateTo('dashboard');
    startTimeRefresh();
    startLiveRealTimeClock();
});

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            navigateTo(page);
            // Close mobile sidebar
            closeMobileSidebar();
        });
    });
}

function navigateTo(pageName) {
    // Deactivate all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate target page
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
    }

    // Activate nav item
    const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (navItem) navItem.classList.add('active');

    // Update header breadcrumb
    const pageNames = {
        dashboard:        { title: 'Dashboard',              subtitle: 'Idam Nagar Smart Parking Overview' },
        'find-parking':   { title: 'Find Parking',           subtitle: 'Search and book available parking spaces' },
        'parking-layout': { title: 'Parking Layout',         subtitle: 'Visual map of all parking slots' },
        bookings:         { title: 'My Bookings',            subtitle: 'View and manage your reservations' },
        admin:            { title: 'Admin Panel',            subtitle: 'Manage parking lots and reservations' },
    };

    const info = pageNames[pageName] || { title: pageName, subtitle: '' };
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (titleEl) titleEl.textContent = info.title;
    if (subtitleEl) subtitleEl.textContent = info.subtitle;

    currentPage = pageName;

    // Load page data
    loadPageData(pageName);

    // Stop dashboard polling if leaving dashboard
    if (pageName !== 'dashboard' && typeof window.stopDashboardLivePolling === 'function') {
        window.stopDashboardLivePolling();
    }

    // Clear countdown intervals when leaving bookings page
    clearCountdownIntervals();
}

function loadPageData(pageName) {
    switch (pageName) {
        case 'dashboard':       loadDashboard();      break;
        case 'find-parking':    loadFindParking();    break;
        case 'parking-layout':  loadParkingLayout();  break;
        case 'bookings':        loadBookings();       break;
        case 'admin':           loadAdmin();          break;
    }
}

// ============================================================
// MOBILE SIDEBAR
// ============================================================

function initMobileSidebar() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('visible');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
}

function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

// ============================================================
// LIVE REAL-TIME CLOCK & TIME REFRESH
// ============================================================

function startLiveRealTimeClock() {
    updateLiveClockDisplays();
    setInterval(updateLiveClockDisplays, 1000);
}

function updateLiveClockDisplays() {
    const now = new Date();
    
    // Time formatted with seconds and AM/PM
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = String(hours % 12 || 12).padStart(2, '0');
    const timeFormatted = `${hours12}:${minutes}:${seconds} ${ampm}`;

    // Date formatted
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateFormatted = `${dayName}, ${now.getDate()} ${monthName} ${now.getFullYear()}`;

    // Header live current time elements
    const headerTimeEl = document.getElementById('live-current-time');
    const headerDateEl = document.getElementById('live-current-date');
    if (headerTimeEl) headerTimeEl.textContent = timeFormatted;
    if (headerDateEl) headerDateEl.textContent = dateFormatted;

    // Sidebar live current time element
    const sidebarTimeEl = document.getElementById('sidebar-current-time');
    if (sidebarTimeEl) sidebarTimeEl.textContent = `${hours12}:${minutes}:${seconds} ${ampm}`;

    // Find Parking page current time banner (if visible)
    const fpTimeEl = document.getElementById('find-parking-current-time');
    if (fpTimeEl) fpTimeEl.textContent = timeFormatted;
}

function getCurrentTime24() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function getCurrentDateIso() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function startTimeRefresh() {
    await refreshSimulatedTime();
    setInterval(refreshSimulatedTime, 30000); // refresh every 30s
}

async function refreshSimulatedTime() {
    try {
        const data = await API.getSimulatedTime();
        simulatedTime = { minutes: data.simulatedTime, formatted: data.simulatedTimeFormatted };
        const el = document.getElementById('sim-time-display');
        if (el) el.textContent = data.simulatedTimeFormatted;
    } catch (e) {
        // Backend not connected - show placeholder
        const el = document.getElementById('sim-time-display');
        if (el && el.textContent === '--:--') el.textContent = '08:00';
    }
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

function initToastSystem() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

/**
 * Shows a toast notification.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration milliseconds
 */
function showToast(type, title, message = '', duration = 4200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconSvgs = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon-badge">
            ${iconSvgs[type] || iconSvgs.info}
        </div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
        </div>
        <button class="toast-close-btn" onclick="this.closest('.toast').remove()" aria-label="Close notification">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.isConnected) {
            toast.style.animation = 'slideInRight 0.25s ease reverse';
            setTimeout(() => toast.remove(), 240);
        }
    }, duration);
}

// ============================================================
// MODAL SYSTEM
// ============================================================

function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
        overlay.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
        overlay.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking overlay background
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
        document.body.style.overflow = '';
    }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => {
            m.classList.remove('open');
            document.body.style.overflow = '';
        });
    }
});

// ============================================================
// COUNTDOWN INTERVALS
// ============================================================

function clearCountdownIntervals() {
    countdownIntervals.forEach(id => clearInterval(id));
    countdownIntervals = [];
}

// ============================================================
// SHARED RENDERING UTILITIES
// ============================================================

function getStatusBadge(status) {
    const map = {
        AVAILABLE:  'badge-available',
        RESERVED:   'badge-reserved',
        OCCUPIED:   'badge-occupied',
        EXPIRED:    'badge-expired',
        COMPLETED:  'badge-available',
        CANCELLED:  'badge-occupied',
        CHECKED_IN: 'badge-available',
        OVERSTAY:   'badge-overstay',
        PENDING:    'badge-reserved',
        WAITING:    'badge-reserved',
    };
    const cls = map[status] || 'badge-available';
    let label = status?.replace('_', ' ') || 'UNKNOWN';
    if (status === 'RESERVED') label = 'RESERVED (20m HOLD)';
    if (status === 'CHECKED_IN') label = 'CHECKED IN (ACTIVE)';
    if (status === 'OVERSTAY') label = 'OVERSTAY (HOLD)';
    return `<span class="badge ${cls}">${label}</span>`;
}

function getSpaceTypeIcon(type) {
    switch (type) {
        case 'TWO_WHEELER':
            return `<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px" aria-label="Two Wheeler"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-3 6.5h6l2-4.5h2"/><path d="M12 12.5L9.5 17.5"/></svg>`;
        case 'ACCESSIBLE':
            return `<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px" aria-label="Accessible"><circle cx="12" cy="4" r="2"/><path d="M18 19a5 5 0 0 1-9.9-1"/><path d="M9 13h5l1.5 5"/><path d="M9.5 8.5L8 14h5"/></svg>`;
        default:
            return `<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px" aria-label="Car"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/></svg>`;
    }
}

function getVehicleTypeIcon(type) {
    if (type === 'TWO_WHEELER') {
        return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.75rem;font-weight:600;color:var(--text-muted)"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-3 6.5h6l2-4.5h2"/><path d="M12 12.5L9.5 17.5"/></svg> 2W</span>`;
    }
    return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.75rem;font-weight:600;color:var(--text-muted)"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/></svg> Car</span>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        const textSpan = btn.querySelector('.btn-text');
        if (textSpan) textSpan.style.opacity = '0';
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
        if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
        }
        const textSpan = btn.querySelector('.btn-text');
        if (textSpan) textSpan.style.opacity = '1';
    }
}

function renderApiError(containerId, err) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const isNetworkError = err?.status === 0;
    el.innerHTML = `
        <div class="alert alert-error mb-4">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
                <strong>${isNetworkError ? 'Backend Not Connected' : 'Error'}</strong>
                <div>${escapeHtml(err?.message || 'Unknown error occurred.')}</div>
                ${isNetworkError ? `<div style="margin-top:8px;font-size:12px;opacity:.8">
                    Ensure the Java server is running: <code>java -cp bin server.SmartParkingServer</code>
                </div>` : ''}
            </div>
        </div>
    `;
}

async function quickAdvanceClock(minutes) {
    try {
        const res = await API.setSimulatedTime({ advance: minutes });
        showToast('info', 'Clock Advanced', `Simulated time is now ${res.simulatedTimeFormatted} (+${minutes} mins).`);
        await refreshSimulatedTime();
        // Automatically trigger expiry check to evaluate 20-min timeouts
        const expRes = await API.processExpired();
        if (expRes.expiredCount > 0) {
            showToast('warning', '20-Min Timeout Triggered', `${expRes.expiredCount} reservation(s) timed out and released.`);
        }
        loadPageData(currentPage);
    } catch (e) {
        showToast('error', 'Clock Error', e.message);
    }
}

// Expose to global scope for inline event handlers
window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.setButtonLoading = setButtonLoading;
window.getStatusBadge = getStatusBadge;
window.getSpaceTypeIcon = getSpaceTypeIcon;
window.getVehicleTypeIcon = getVehicleTypeIcon;
window.escapeHtml = escapeHtml;
window.renderApiError = renderApiError;
window.simulatedTime = simulatedTime;
window.clearCountdownIntervals = clearCountdownIntervals;
window.countdownIntervals = countdownIntervals;
window.quickAdvanceClock = quickAdvanceClock;
window.getCurrentTime24 = getCurrentTime24;
window.getCurrentDateIso = getCurrentDateIso;
window.updateLiveClockDisplays = updateLiveClockDisplays;
