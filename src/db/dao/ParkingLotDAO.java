package db.dao;

import db.DatabaseManager;
import model.ParkingLot;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for parking_lots table.
 */
public class ParkingLotDAO {

    public List<ParkingLot> getAllLots() {
        List<ParkingLot> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable()) return list;

        String sql = "SELECT lot_id, lot_name, location_node FROM parking_lots ORDER BY lot_id ASC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                ParkingLot lot = new ParkingLot(
                        rs.getString("lot_id"),
                        rs.getString("lot_name"),
                        rs.getString("location_node")
                );
                list.add(lot);
            }
        } catch (SQLException e) {
            System.err.println("[ParkingLotDAO] Error fetching lots: " + e.getMessage());
        }
        return list;
    }

    public ParkingLot getLotById(String lotId) {
        if (!DatabaseManager.isDriverAvailable() || lotId == null) return null;

        String sql = "SELECT lot_id, lot_name, location_node FROM parking_lots WHERE UPPER(lot_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, lotId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new ParkingLot(
                            rs.getString("lot_id"),
                            rs.getString("lot_name"),
                            rs.getString("location_node")
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[ParkingLotDAO] Error fetching lot by id: " + e.getMessage());
        }
        return null;
    }

    public boolean saveLot(ParkingLot lot) {
        if (!DatabaseManager.isDriverAvailable() || lot == null) return false;

        String sql = "INSERT OR REPLACE INTO parking_lots (lot_id, lot_name, location_node, total_spaces) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, lot.getLotId());
            ps.setString(2, lot.getLotName());
            ps.setString(3, lot.getLocationNode());
            ps.setInt(4, lot.countTotalSpaces());
            ps.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("[ParkingLotDAO] Error saving lot: " + e.getMessage());
            return false;
        }
    }
}
