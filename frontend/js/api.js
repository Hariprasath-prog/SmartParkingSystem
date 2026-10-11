/**
 * api.js — Centralized API Service
 * All backend communication goes through this module.
 *
 * Base URL points to the Spring Boot REST API that wraps the existing Java backend.
 * The Java backend (ParkingOperationsController, ReservationManager, etc.) does all
 * business logic. This module is purely a transport/HTTP layer.
 *
 * BACKEND HOST: http://localhost:8080/api
 */

const API_BASE_URL = 'http://localhost:8080/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Core fetch wrapper with error handling, timeout, and JSON parsing.
 * @param {string} endpoint - API path (e.g. '/dashboard')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} parsed JSON response
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: { ...defaultHeaders, ...(options.headers || {}) },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Attempt to parse JSON regardless of status
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new ApiError(errorMessage, response.status, data);
        }

        return data;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new ApiError('Request timed out. Please check if the backend server is running.', 408);
        }

        if (error instanceof ApiError) {
            throw error;
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new ApiError(
                'Cannot connect to backend server. Please ensure the Spring Boot application is running on http://localhost:8080.',
                0
            );
        }

        throw new ApiError(error.message || 'An unexpected error occurred.', 500);
    }
}

/**
 * Custom error class for API errors.
 */
class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// ============================================================
// GET Requests
// ============================================================

const API = {

    /**
     * GET /api/dashboard
     * Returns aggregated dashboard statistics from actual slot data.
     */
    getDashboard: () => apiFetch('/dashboard'),

    /**
     * GET /api/lots
     */
    getLots: () => apiFetch('/lots'),

    /**
     * GET /api/lots/:lotId
     */
    getLot: (lotId) => apiFetch(`/lots/${encodeURIComponent(lotId)}`),

    /**
     * GET /api/spaces?lotId=&status=&type=
     * @param {Object} filters - { lotId, status, type }
     */
    getSpaces: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.lotId)  params.set('lotId',  filters.lotId);
        if (filters.status) params.set('status', filters.status);
        if (filters.type)   params.set('type',   filters.type);
        const query = params.toString() ? `?${params}` : '';
        return apiFetch(`/spaces${query}`);
    },

    /**
     * GET /api/spaces/:spaceId
     */
    getSpace: (spaceId) => apiFetch(`/spaces/${encodeURIComponent(spaceId)}`),

    /**
     * GET /api/vehicles
     */
    getVehicles: () => apiFetch('/vehicles'),

    /**
     * GET /api/vehicles/:vehicleId
     */
    getVehicle: (vehicleId) => apiFetch(`/vehicles/${encodeURIComponent(vehicleId)}`),

    /**
     * POST /api/vehicles/register
     * @param {{ vehicleId, ownerName, vehicleType, accessiblePermit }} body
     */
    registerVehicle: (body) => apiFetch('/vehicles/register', {
        method: 'POST',
        body: JSON.stringify(body),
    }),

    /**
     * GET /api/reservations?vehicleId=&status=
     */
    getReservations: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
        if (filters.status)    params.set('status',    filters.status);
        const query = params.toString() ? `?${params}` : '';
        return apiFetch(`/reservations${query}`);
    },

    /**
     * GET /api/reservations/:reservationId
     */
    getReservation: (reservationId) => apiFetch(`/reservations/${encodeURIComponent(reservationId)}`),

    /**
     * POST /api/bookings
     * Core allocation — all logic handled by Java backend.
     * @param {{
     *   vehicleId: string,
     *   ownerName: string,
     *   vehicleType: string,
     *   accessiblePermit: boolean,
     *   originNode: string,
     *   startTime: number,   // minutes from midnight
     *   endTime: number,     // minutes from midnight
     *   accessPriority: number
     * }} body
     */
    createBooking: (body) => apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
    }),

    /**
     * POST /api/bookings/:reservationId/checkin
     */
    checkIn: (reservationId, vehicleId = null) => apiFetch(`/bookings/${encodeURIComponent(reservationId)}/checkin`, {
        method: 'POST',
        body: JSON.stringify(vehicleId ? { vehicleId } : {}),
    }),

    /**
     * PUT /api/bookings/:reservationId/space
     * Reassigns / updates the allocated parking space.
     */
    updateBookingSpace: (reservationId, spaceId) => apiFetch(`/bookings/${encodeURIComponent(reservationId)}/space`, {
        method: 'PUT',
        body: JSON.stringify({ spaceId }),
    }),

    /**
     * POST /api/bookings/:reservationId/checkout
     */
    checkOut: (reservationId) => apiFetch(`/bookings/${encodeURIComponent(reservationId)}/checkout`, {
        method: 'POST',
        body: JSON.stringify({}),
    }),

    /**
     * POST /api/bookings/:reservationId/cancel
     */
    cancelReservation: (reservationId) => apiFetch(`/bookings/${encodeURIComponent(reservationId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
    }),

    /**
     * POST /api/admin/process-expired
     * Triggers the Java backend's grace-period expiration engine.
     */
    processExpired: () => apiFetch('/admin/process-expired', {
        method: 'POST',
        body: JSON.stringify({}),
    }),

    /**
     * GET /api/admin/time
     */
    getSimulatedTime: () => apiFetch('/admin/time'),

    /**
     * PUT /api/admin/time
     * @param {{ minutes?: number, advance?: number }} body
     */
    setSimulatedTime: (body) => apiFetch('/admin/time', {
        method: 'PUT',
        body: JSON.stringify(body),
    }),

    /**
     * GET /api/admin/queue
     * Returns the PriorityQueue waiting list from the Java backend.
     */
    getWaitingQueue: () => apiFetch('/admin/queue'),

    /**
     * GET /api/lots/suggestions?originNode=&vehicleType=&accessiblePermit=&startTime=&endTime=
     * Returns nearby alternative lots with Dijkstra distance and route
     */
    getLotSuggestions: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.originNode)       params.set('originNode', filters.originNode);
        if (filters.vehicleType)      params.set('vehicleType', filters.vehicleType);
        if (filters.accessiblePermit) params.set('accessiblePermit', filters.accessiblePermit);
        if (filters.startTime !== undefined) params.set('startTime', filters.startTime);
        if (filters.endTime !== undefined)   params.set('endTime', filters.endTime);
        const query = params.toString() ? `?${params}` : '';
        return apiFetch(`/lots/suggestions${query}`);
    },

    /**
     * GET /api/graph/nodes
     * Returns the 9 road network nodes (N1–N9) of Idam Nagar.
     */
    getGraphNodes: () => apiFetch('/graph/nodes'),
};

// ============================================================
// UTILITY: Time Conversion Helpers
// ============================================================

/**
 * Converts "HH:MM" string to minutes from midnight.
 * Used to convert datetime-local input to the backend's time format.
 * @param {string} timeStr - "HH:MM"
 * @returns {number} minutes from midnight
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(':').map(Number);
    return (hours % 24) * 60 + (mins || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" string.
 * @param {number} minutes
 * @returns {string} "HH:MM"
 */
function minutesToTime(minutes) {
    const h = Math.floor((minutes / 60) % 24);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Converts a datetime-local input value (e.g., "2025-01-15T09:30")
 * to minutes from midnight.
 * @param {string} datetimeLocal - ISO-like datetime string
 * @returns {number} minutes from midnight
 */
function datetimeLocalToMinutes(datetimeLocal) {
    if (!datetimeLocal) return 0;
    // Extract just the time part (HH:MM)
    const timePart = datetimeLocal.includes('T')
        ? datetimeLocal.split('T')[1].substring(0, 5)
        : datetimeLocal.substring(0, 5);
    return timeToMinutes(timePart);
}

/**
 * Calculates duration in hours and minutes between two minute values.
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @returns {string} human-readable duration
 */
function formatDuration(startMinutes, endMinutes) {
    const diff = endMinutes - startMinutes;
    if (diff <= 0) return '0 min';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

/**
 * Calculates remaining time from current simulated time to end time.
 * @param {number} endMinutes
 * @param {number} currentSimMinutes
 * @returns {{ text: string, status: 'active'|'warning'|'expired' }}
 */
function getRemainingTime(endMinutes, currentSimMinutes) {
    const remaining = endMinutes - currentSimMinutes;
    if (remaining <= 0) {
        return { text: 'Expired', status: 'expired' };
    }
    if (remaining <= 30) {
        return { text: `${remaining} min remaining`, status: 'warning' };
    }
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const text = h > 0 ? `${h}h ${m}min remaining` : `${m}min remaining`;
    return { text, status: 'active' };
}

// Export for use in other modules
window.API = API;
window.ApiError = ApiError;
window.timeToMinutes = timeToMinutes;
window.minutesToTime = minutesToTime;
window.datetimeLocalToMinutes = datetimeLocalToMinutes;
window.formatDuration = formatDuration;
window.getRemainingTime = getRemainingTime;
