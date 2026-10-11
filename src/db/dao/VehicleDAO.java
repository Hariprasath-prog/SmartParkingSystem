package db.dao;

import db.DatabaseManager;
import model.Vehicle;
import model.VehicleType;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for vehicles table.
 */
public class VehicleDAO {

    public List<Vehicle> getAllVehicles() {
        List<Vehicle> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable()) return list;

        String sql = "SELECT vehicle_id, owner_name, vehicle_type, accessible_permit FROM vehicles ORDER BY vehicle_id ASC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                list.add(mapRowToVehicle(rs));
            }
        } catch (SQLException e) {
            System.err.println("[VehicleDAO] Error fetching vehicles: " + e.getMessage());
        }
        return list;
    }

    public Vehicle getVehicleById(String vehicleId) {
        if (!DatabaseManager.isDriverAvailable() || vehicleId == null) return null;

        String sql = "SELECT vehicle_id, owner_name, vehicle_type, accessible_permit FROM vehicles WHERE UPPER(vehicle_id) = UPPER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, vehicleId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRowToVehicle(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("[VehicleDAO] Error fetching vehicle by id: " + e.getMessage());
        }
        return null;
    }

    public boolean saveVehicle(Vehicle vehicle) {
        if (!DatabaseManager.isDriverAvailable() || vehicle == null) return false;

        String sql = "INSERT OR REPLACE INTO vehicles (vehicle_id, owner_name, vehicle_type, accessible_permit) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, vehicle.getVehicleId().toUpperCase());
            ps.setString(2, vehicle.getOwnerName());
            ps.setString(3, vehicle.getType().name());
            ps.setBoolean(4, vehicle.hasAccessiblePermit());
            ps.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("[VehicleDAO] Error saving vehicle: " + e.getMessage());
            return false;
        }
    }

    private Vehicle mapRowToVehicle(ResultSet rs) throws SQLException {
        String vehId = rs.getString("vehicle_id");
        String owner = rs.getString("owner_name");
        String vType = rs.getString("vehicle_type");
        boolean permit = rs.getBoolean("accessible_permit");

        VehicleType type = "TWO_WHEELER".equalsIgnoreCase(vType) ? VehicleType.TWO_WHEELER : VehicleType.CAR;
        return new Vehicle(vehId, owner, type, permit);
    }
}
