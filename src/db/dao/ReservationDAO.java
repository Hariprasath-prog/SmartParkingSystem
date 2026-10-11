package db.dao;

import db.DatabaseManager;
import model.ParkingSpace;
import model.Reservation;
import model.ReservationStatus;
import model.Vehicle;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Data Access Object for reservations table.
 * Executes indexed interval queries and lifecycle updates.
 */
public class ReservationDAO {

    /**
     * Mathematical interval overlap check in SQL:
     * (newStart < existingEnd AND newEnd > existingStart)
     */
    public boolean hasOverlappingReservation(String spaceId, int startTime, int endTime) {
        if (!DatabaseManager.isDriverAvailable() || spaceId == null) return false;

        String sql = "SELECT COUNT(*) FROM reservations " +
                     "WHERE UPPER(space_id) = UPPER(?) " +
                     "  AND status IN ('RESERVED', 'CHECKED_IN', 'OVERSTAY') " +
                     "  AND start_time < ? AND end_time > ?";

        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, spaceId.trim());
            ps.setInt(2, endTime);
            ps.setInt(3, startTime);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (SQLException e) {
            System.err.println("[ReservationDAO] Error checking overlapping reservation: " + e.getMessage());
        }
        return false;
    }

    public boolean saveReservation(Reservation res) {
        if (!DatabaseManager.isDriverAvailable() || res == null) return false;

        String sql = "INSERT OR REPLACE INTO reservations " +
                     "(reservation_id, vehicle_id, space_id, lot_id, start_time, end_time, created_at, expiry_deadline, status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, res.getReservationId());
            ps.setString(2, res.getVehicle().getVehicleId());
            ps.setString(3, res.getSpace().getSpaceId());
            ps.setString(4, res.getSpace().getLotId());
            ps.setInt(5, res.getStartTime());
            ps.setInt(6, res.getEndTime());
            ps.setInt(7, res.getCreatedAt());
            ps.setInt(8, res.getExpiryDeadline());
            ps.setString(9, res.getStatus().name());

            ps.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("[ReservationDAO] Error saving reservation: " + e.getMessage());
            return false;
        }
    }

    public boolean updateReservationStatus(String reservationId, ReservationStatus status,
                                          Integer checkedInAt, Integer checkedOutAt) {
        if (!DatabaseManager.isDriverAvailable() || reservationId == null || status == null) return false;

        StringBuilder sb = new StringBuilder("UPDATE reservations SET status = ?");
        if (checkedInAt != null) sb.append(", checked_in_at = ").append(checkedInAt);
        if (checkedOutAt != null) sb.append(", checked_out_at = ").append(checkedOutAt);
        sb.append(" WHERE UPPER(reservation_id) = UPPER(?)");

        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sb.toString())) {

            ps.setString(1, status.name());
            ps.setString(2, reservationId.trim());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ReservationDAO] Error updating reservation status: " + e.getMessage());
            return false;
        }
    }

    public boolean updateReservationSpace(String reservationId, String newSpaceId, String newLotId) {
        if (!DatabaseManager.isDriverAvailable() || reservationId == null || newSpaceId == null) return false;

        String sql = "UPDATE reservations SET space_id = ?, lot_id = ? WHERE UPPER(reservation_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, newSpaceId.trim());
            ps.setString(2, newLotId != null ? newLotId.trim() : "");
            ps.setString(3, reservationId.trim());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ReservationDAO] Error updating reservation space: " + e.getMessage());
            return false;
        }
    }

    public List<Reservation> getAllReservations(Map<String, Vehicle> vehicleMap, Map<String, ParkingSpace> spaceMap) {
        List<Reservation> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable()) return list;

        String sql = "SELECT reservation_id, vehicle_id, space_id, lot_id, start_time, end_time, " +
                     "       created_at, expiry_deadline, status FROM reservations ORDER BY created_at DESC";

        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                Reservation res = mapRowToReservation(rs, vehicleMap, spaceMap);
                if (res != null) {
                    list.add(res);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ReservationDAO] Error fetching all reservations: " + e.getMessage());
        }
        return list;
    }

    private Reservation mapRowToReservation(ResultSet rs, Map<String, Vehicle> vehicleMap, Map<String, ParkingSpace> spaceMap) throws SQLException {
        String resId = rs.getString("reservation_id");
        String vehId = rs.getString("vehicle_id");
        String spaceId = rs.getString("space_id");
        int start = rs.getInt("start_time");
        int end = rs.getInt("end_time");
        int created = rs.getInt("created_at");
        int deadline = rs.getInt("expiry_deadline");
        String statusStr = rs.getString("status");

        Vehicle v = (vehicleMap != null) ? vehicleMap.get(vehId.toUpperCase()) : null;
        if (v == null) {
            v = new VehicleDAO().getVehicleById(vehId);
        }

        ParkingSpace sp = (spaceMap != null) ? spaceMap.get(spaceId.toUpperCase()) : null;
        if (sp == null) {
            sp = new ParkingSpaceDAO().getSpaceById(spaceId);
        }

        if (v == null || sp == null) return null;

        Reservation res = new Reservation(resId, v, sp, start, end, created, deadline);
        try {
            res.setStatus(ReservationStatus.valueOf(statusStr));
        } catch (Exception ignored) {}

        return res;
    }
}
