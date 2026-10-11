package db.dao;

import db.DatabaseManager;
import model.AccessibleSpace;
import model.CarSpace;
import model.ParkingSpace;
import model.SpaceStatus;
import model.TwoWheelerSpace;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for parking_spaces table.
 */
public class ParkingSpaceDAO {

    public List<ParkingSpace> getAllSpaces() {
        List<ParkingSpace> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable()) return list;

        String sql = "SELECT space_id, lot_id, space_type, status, floor_level FROM parking_spaces ORDER BY space_id ASC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                ParkingSpace sp = mapRowToSpace(rs);
                if (sp != null) list.add(sp);
            }
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error fetching spaces: " + e.getMessage());
        }
        return list;
    }

    public List<ParkingSpace> getSpacesByLot(String lotId) {
        List<ParkingSpace> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable() || lotId == null) return list;

        String sql = "SELECT space_id, lot_id, space_type, status, floor_level FROM parking_spaces WHERE UPPER(lot_id) = UPPER(?) ORDER BY space_id ASC";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, lotId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ParkingSpace sp = mapRowToSpace(rs);
                    if (sp != null) list.add(sp);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error fetching spaces by lot: " + e.getMessage());
        }
        return list;
    }

    public ParkingSpace getSpaceById(String spaceId) {
        if (!DatabaseManager.isDriverAvailable() || spaceId == null) return null;

        String sql = "SELECT space_id, lot_id, space_type, status, floor_level FROM parking_spaces WHERE UPPER(space_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, spaceId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRowToSpace(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error fetching space by id: " + e.getMessage());
        }
        return null;
    }

    public boolean updateSpaceStatus(String spaceId, SpaceStatus status) {
        if (!DatabaseManager.isDriverAvailable() || spaceId == null || status == null) return false;

        String sql = "UPDATE parking_spaces SET status = ? WHERE UPPER(space_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, status.name());
            ps.setString(2, spaceId.trim());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error updating space status: " + e.getMessage());
            return false;
        }
    }

    public boolean updateSpaceType(String spaceId, String spaceType) {
        if (!DatabaseManager.isDriverAvailable() || spaceId == null || spaceType == null) return false;

        String sql = "UPDATE parking_spaces SET space_type = ? WHERE UPPER(space_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, spaceType.trim().toUpperCase());
            ps.setString(2, spaceId.trim());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error updating space type: " + e.getMessage());
            return false;
        }
    }

    public boolean saveSpace(ParkingSpace space) {
        if (!DatabaseManager.isDriverAvailable() || space == null) return false;

        String sql = "INSERT OR REPLACE INTO parking_spaces (space_id, lot_id, space_type, status, floor_level) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, space.getSpaceId());
            ps.setString(2, space.getLotId());
            ps.setString(3, space.getSpaceType());
            ps.setString(4, space.getStatus().name());
            ps.setInt(5, 1);
            ps.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("[ParkingSpaceDAO] Error saving space: " + e.getMessage());
            return false;
        }
    }

    private ParkingSpace mapRowToSpace(ResultSet rs) throws SQLException {
        String spaceId = rs.getString("space_id");
        String lotId = rs.getString("lot_id");
        String spaceType = rs.getString("space_type");
        String statusStr = rs.getString("status");

        ParkingSpace space;
        if ("TWO_WHEELER".equalsIgnoreCase(spaceType)) {
            space = new TwoWheelerSpace(spaceId, lotId);
        } else if ("ACCESSIBLE".equalsIgnoreCase(spaceType)) {
            space = new AccessibleSpace(spaceId, lotId);
        } else {
            space = new CarSpace(spaceId, lotId);
        }

        try {
            space.setStatus(SpaceStatus.valueOf(statusStr));
        } catch (Exception ignored) {}

        return space;
    }
}
