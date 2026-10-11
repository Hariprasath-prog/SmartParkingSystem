package db.dao;

import db.DatabaseManager;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for users table.
 */
public class UserDAO {

    public static class UserRecord {
        private final int userId;
        private final String username;
        private final String fullName;
        private final String role;
        private final String vehicleId;

        public UserRecord(int userId, String username, String fullName, String role, String vehicleId) {
            this.userId = userId;
            this.username = username;
            this.fullName = fullName;
            this.role = role;
            this.vehicleId = vehicleId;
        }

        public int getUserId() { return userId; }
        public String getUsername() { return username; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public String getVehicleId() { return vehicleId; }
    }

    public UserRecord authenticate(String username, String password) {
        if (!DatabaseManager.isDriverAvailable() || username == null || password == null) return null;

        String sql = "SELECT user_id, username, full_name, role, vehicle_id FROM users " +
                     "WHERE UPPER(username) = UPPER(?) AND password_hash = ?";

        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username.trim());
            ps.setString(2, password.trim());

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new UserRecord(
                            rs.getInt("user_id"),
                            rs.getString("username"),
                            rs.getString("full_name"),
                            rs.getString("role"),
                            rs.getString("vehicle_id")
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO] Error authenticating user: " + e.getMessage());
        }
        return null;
    }

    public boolean registerUser(String username, String password, String fullName, String role, String vehicleId) {
        if (!DatabaseManager.isDriverAvailable() || username == null || password == null) return false;

        String sql = "INSERT INTO users (username, password_hash, full_name, role, vehicle_id) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username.trim().toLowerCase());
            ps.setString(2, password.trim());
            ps.setString(3, fullName != null ? fullName.trim() : username);
            ps.setString(4, role != null ? role.trim().toUpperCase() : "USER");
            ps.setString(5, vehicleId != null ? vehicleId.trim().toUpperCase() : null);

            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[UserDAO] Error registering user: " + e.getMessage());
            return false;
        }
    }

    public List<UserRecord> getAllUsers() {
        List<UserRecord> list = new ArrayList<>();
        if (!DatabaseManager.isDriverAvailable()) return list;

        String sql = "SELECT user_id, username, full_name, role, vehicle_id FROM users ORDER BY user_id ASC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                list.add(new UserRecord(
                        rs.getInt("user_id"),
                        rs.getString("username"),
                        rs.getString("full_name"),
                        rs.getString("role"),
                        rs.getString("vehicle_id")
                ));
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO] Error fetching users: " + e.getMessage());
        }
        return list;
    }
}
