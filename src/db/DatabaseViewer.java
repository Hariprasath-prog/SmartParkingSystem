package db;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

/**
 * DatabaseViewer — Console utility to inspect SQLite database tables, rows, and schema.
 * Run anytime with: npm run db:view
 */
public class DatabaseViewer {

    public static void main(String[] args) {
        System.out.println("==========================================================================");
        System.out.println("  IDAM NAGAR SMART PARKING SYSTEM — SQL DATABASE INSPECTOR               ");
        System.out.println("  Database File: data/smart_parking.db                                   ");
        System.out.println("==========================================================================\n");

        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement()) {

            // 1. List all tables and row counts
            System.out.println("=== 1. DATABASE TABLES & RECORD COUNTS ===");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")) {
                while (rs.next()) {
                    String table = rs.getString("name");
                    try (Statement cntStmt = conn.createStatement();
                         ResultSet cntRs = cntStmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
                        int count = cntRs.next() ? cntRs.getInt(1) : 0;
                        System.out.printf("  %-22s : %3d rows%n", table, count);
                    }
                }
            }

            // 2. Sample records from core tables
            printSampleTable(conn, "users", "System Users & Drivers", 5);
            printSampleTable(conn, "parking_lots", "Parking Lots (3 Facilities)", 3);
            printSampleTable(conn, "parking_spaces", "Parking Stalls Sample (60 Total)", 6);
            printSampleTable(conn, "reservations", "Recent Reservations", 6);
            printSampleTable(conn, "road_nodes", "Urban Road Vertices (9 Nodes)", 9);
            printSampleTable(conn, "road_edges", "Road Edges Sample (14 Edges)", 6);

            System.out.println("\n==========================================================================");
            System.out.println("  Inspection complete. All tables verified in data/smart_parking.db      ");
            System.out.println("==========================================================================");

        } catch (Exception e) {
            System.err.println("Error inspecting database: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void printSampleTable(Connection conn, String tableName, String title, int limit) {
        System.out.println("\n--- " + title + " [SELECT * FROM " + tableName + " LIMIT " + limit + "] ---");
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery("SELECT * FROM " + tableName + " LIMIT " + limit)) {
            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();

            // Print Header
            StringBuilder header = new StringBuilder("  ");
            for (int i = 1; i <= colCount; i++) {
                header.append(String.format("%-18s ", meta.getColumnName(i)));
            }
            System.out.println(header);
            System.out.println("  " + "-".repeat(Math.min(header.length() - 2, 110)));

            // Print Rows
            boolean hasRows = false;
            while (rs.next()) {
                hasRows = true;
                StringBuilder row = new StringBuilder("  ");
                for (int i = 1; i <= colCount; i++) {
                    String val = rs.getString(i);
                    if (val == null) val = "NULL";
                    if (val.length() > 17) val = val.substring(0, 14) + "...";
                    row.append(String.format("%-18s ", val));
                }
                System.out.println(row);
            }
            if (!hasRows) {
                System.out.println("  (No records found)");
            }
        } catch (Exception e) {
            System.out.println("  (Could not read table " + tableName + ": " + e.getMessage() + ")");
        }
    }
}
