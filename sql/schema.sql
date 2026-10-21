-- =============================================================================
-- IDAM NAGAR URBAN MOBILITY & SMART PARKING AUTHORITY
-- Relational Database Schema (DDL)
-- Compatible with SQLite, PostgreSQL, and MySQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ROAD NETWORK (GRAPH VERTICES & EDGES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS road_nodes (
    node_id VARCHAR(10) PRIMARY KEY,
    node_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS road_edges (
    edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node VARCHAR(10) NOT NULL,
    to_node VARCHAR(10) NOT NULL,
    travel_time_minutes INTEGER NOT NULL CHECK (travel_time_minutes > 0),
    is_bidirectional BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (from_node) REFERENCES road_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (to_node) REFERENCES road_nodes(node_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 2. PARKING FACILITIES & SPACES (60 BAYS TOTAL ACROSS 3 LOTS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parking_lots (
    lot_id VARCHAR(10) PRIMARY KEY,
    lot_name VARCHAR(100) NOT NULL,
    location_node VARCHAR(10) NOT NULL,
    total_spaces INTEGER NOT NULL DEFAULT 20,
    FOREIGN KEY (location_node) REFERENCES road_nodes(node_id)
);

CREATE TABLE IF NOT EXISTS parking_spaces (
    space_id VARCHAR(15) PRIMARY KEY,
    lot_id VARCHAR(10) NOT NULL,
    space_type VARCHAR(20) NOT NULL CHECK (space_type IN ('CAR', 'TWO_WHEELER', 'ACCESSIBLE')),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED')),
    floor_level INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(lot_id) ON DELETE CASCADE
);

-- Index for searching available bays by lot and type
CREATE INDEX IF NOT EXISTS idx_spaces_lot_status_type
ON parking_spaces (lot_id, status, space_type);

-- -----------------------------------------------------------------------------
-- 3. VEHICLE REGISTRY & USER ACCOUNTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(20) PRIMARY KEY,
    owner_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('CAR', 'TWO_WHEELER')),
    accessible_permit BOOLEAN NOT NULL DEFAULT 0,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    vehicle_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 4. RESERVATIONS & BOOKING LEDGER
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    space_id VARCHAR(15) NOT NULL,
    lot_id VARCHAR(10) NOT NULL,
    start_time INTEGER NOT NULL,          -- Minutes from midnight (e.g. 600 = 10:00 AM)
    end_time INTEGER NOT NULL,            -- Minutes from midnight
    created_at INTEGER NOT NULL,          -- Simulated time of creation
    expiry_deadline INTEGER NOT NULL,     -- Max(createdAt, startTime) + 20 minutes
    status VARCHAR(20) NOT NULL CHECK (status IN ('RESERVED', 'CHECKED_IN', 'OVERSTAY', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    hourly_rate REAL NOT NULL DEFAULT 50.0,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    total_cost REAL NOT NULL DEFAULT 100.0,
    checked_in_at INTEGER,
    checked_out_at INTEGER,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (space_id) REFERENCES parking_spaces(space_id),
    FOREIGN KEY (lot_id) REFERENCES parking_lots(lot_id)
);

-- Crucial index for interval collision detection (start < existingEnd AND end > existingStart)
CREATE INDEX IF NOT EXISTS idx_res_interval_check
ON reservations (space_id, status, start_time, end_time);

-- -----------------------------------------------------------------------------
-- 5. WAITING LIST PRIORITY QUEUE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS waiting_queue (
    request_id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    origin_node VARCHAR(10) NOT NULL,
    requested_start INTEGER NOT NULL,
    requested_end INTEGER NOT NULL,
    access_priority INTEGER NOT NULL DEFAULT 1,
    request_time INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ALLOCATED', 'CANCELLED')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (origin_node) REFERENCES road_nodes(node_id)
);

-- -----------------------------------------------------------------------------
-- 6. SYSTEM SETTINGS & METRICS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
