-- =============================================================================
-- IDAM NAGAR URBAN MOBILITY & SMART PARKING AUTHORITY
-- Initial Seed Data (DML)
-- Matches SampleData.java exactly (60 bays across 3 sectors per facility)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ROAD NETWORK NODES (9 URBAN VERTICES)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO road_nodes (node_id, node_name) VALUES
('N1', 'Idam North Gateway'),
('N2', 'Market Complex'),
('N3', 'Civic Centre'),
('N4', 'Tech Boulevard'),
('N5', 'Central Square'),
('N6', 'North Gate Plaza (LOT-A)'),
('N7', 'Financial District'),
('N8', 'Central Commercial (LOT-B)'),
('N9', 'South Metro Station (LOT-C)');

-- -----------------------------------------------------------------------------
-- 2. ROAD NETWORK EDGES (POSITIVE TRAVEL TIMES IN MINUTES)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO road_edges (from_node, to_node, travel_time_minutes, is_bidirectional) VALUES
('N1', 'N2', 4, 1),
('N1', 'N3', 7, 1),
('N2', 'N4', 3, 1),
('N2', 'N6', 6, 1),
('N3', 'N4', 4, 1),
('N3', 'N5', 5, 1),
('N4', 'N5', 2, 1),
('N4', 'N6', 4, 1),
('N5', 'N7', 3, 1),
('N5', 'N8', 5, 1),
('N6', 'N7', 6, 1),
('N7', 'N8', 3, 1),
('N7', 'N9', 5, 1),
('N8', 'N9', 4, 1);

-- -----------------------------------------------------------------------------
-- 3. PARKING FACILITIES (20 BAYS EACH = 60 BAYS TOTAL)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO parking_lots (lot_id, lot_name, location_node, total_spaces) VALUES
('LOT-A', 'North Gate Plaza Lot', 'N6', 20),
('LOT-B', 'Central Commercial Hub', 'N8', 20),
('LOT-C', 'South Metro Transit Lot', 'N9', 20);

-- -----------------------------------------------------------------------------
-- 4. PARKING SPACES: LOT-A (20 BAYS)
-- -----------------------------------------------------------------------------
-- Sector 1: Standard Cars (12 bays)
INSERT OR IGNORE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES
('A-C01', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C02', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C03', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C04', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C05', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C06', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C07', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C08', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C09', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C10', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C11', 'LOT-A', 'CAR', 'AVAILABLE', 1),
('A-C12', 'LOT-A', 'CAR', 'AVAILABLE', 1);

-- Sector 2: Two-Wheelers (6 bays)
INSERT OR IGNORE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES
('A-T01', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1),
('A-T02', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1),
('A-T03', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1),
('A-T04', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1),
('A-T05', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1),
('A-T06', 'LOT-A', 'TWO_WHEELER', 'AVAILABLE', 1);

-- Sector 3: Accessible Disability Bays (2 bays)
INSERT OR IGNORE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES
('A-ACC1', 'LOT-A', 'ACCESSIBLE', 'AVAILABLE', 1),
('A-ACC2', 'LOT-A', 'ACCESSIBLE', 'AVAILABLE', 1);

-- -----------------------------------------------------------------------------
-- 5. PARKING SPACES: LOT-B (20 BAYS)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES
('B-C01', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C02', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C03', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C04', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C05', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C06', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C07', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C08', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C09', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C10', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C11', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-C12', 'LOT-B', 'CAR', 'AVAILABLE', 1),
('B-T01', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-T02', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-T03', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-T04', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-T05', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-T06', 'LOT-B', 'TWO_WHEELER', 'AVAILABLE', 1),
('B-ACC1', 'LOT-B', 'ACCESSIBLE', 'AVAILABLE', 1),
('B-ACC2', 'LOT-B', 'ACCESSIBLE', 'AVAILABLE', 1);

-- -----------------------------------------------------------------------------
-- 6. PARKING SPACES: LOT-C (20 BAYS)
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES
('C-C01', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C02', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C03', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C04', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C05', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C06', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C07', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C08', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C09', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C10', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C11', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-C12', 'LOT-C', 'CAR', 'AVAILABLE', 1),
('C-T01', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-T02', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-T03', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-T04', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-T05', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-T06', 'LOT-C', 'TWO_WHEELER', 'AVAILABLE', 1),
('C-ACC1', 'LOT-C', 'ACCESSIBLE', 'AVAILABLE', 1),
('C-ACC2', 'LOT-C', 'ACCESSIBLE', 'AVAILABLE', 1);

-- -----------------------------------------------------------------------------
-- 7. REGISTERED FLEET TEST VEHICLES
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO vehicles (vehicle_id, owner_name, vehicle_type, accessible_permit) VALUES
('KA-01-AB-1234', 'John Doe', 'CAR', 0),
('KA-02-CD-5678', 'Priya Sharma', 'CAR', 1),
('KA-03-EF-9012', 'Arun Kumar', 'TWO_WHEELER', 0),
('KA-04-GH-3456', 'Meera Patel', 'CAR', 0),
('KA-05-IJ-7890', 'Deepak Verma', 'CAR', 0),
('TN-01-AB-1234', 'Anand Kumar', 'CAR', 0);

-- -----------------------------------------------------------------------------
-- 8. SEEDED USER ACCOUNTS
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, vehicle_id) VALUES
('admin', 'admin123', 'Chief Mobility Controller', 'ADMIN', NULL),
('supervisor', 'transit2026', 'Operations Supervisor', 'ADMIN', NULL),
('johndoe', 'user123', 'John Doe', 'USER', 'KA-01-AB-1234'),
('priyasharma', 'user123', 'Priya Sharma', 'USER', 'KA-02-CD-5678'),
('arunkumar', 'user123', 'Arun Kumar', 'USER', 'KA-03-EF-9012');

-- -----------------------------------------------------------------------------
-- 9. SYSTEM SETTINGS
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES
('simulated_time_minutes', '480'),
('arrival_hold_minutes', '20'),
('district_name', 'Idam Nagar Commercial District'),
('car_hourly_rate', '50.0'),
('two_wheeler_hourly_rate', '20.0');
