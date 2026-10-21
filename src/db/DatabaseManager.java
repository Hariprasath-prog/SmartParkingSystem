package db;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Manages SQLite database connection lifecycle, automatic schema migrations,
 * and seed data population for the Smart Parking Allocation System.
 */
public class DatabaseManager {

    private static final String DB_DIR = "data";
    private static final String DB_FILE = "data/smart_parking.db";
    private static final String JDBC_URL = "jdbc:sqlite:" + DB_FILE;

    private static boolean initialized = false;
    private static boolean driverAvailable = false;

    static {
        try {
            Class.forName("org.sqlite.JDBC");
            driverAvailable = true;
        } catch (ClassNotFoundException e) {
            System.err.println("[DatabaseManager] Warning: org.sqlite.JDBC not found in classpath. SQL operations disabled.");
            driverAvailable = false;
        }
    }

    public static boolean isDriverAvailable() {
        return driverAvailable;
    }

    public static synchronized Connection getConnection() throws SQLException {
        if (!driverAvailable) {
            throw new SQLException("SQLite JDBC driver is not available in classpath.");
        }
        Connection conn = DriverManager.getConnection(JDBC_URL);
        // Enable WAL mode (Write-Ahead Logging) and Foreign Keys for safe concurrent read/write
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA journal_mode = WAL;");
            stmt.execute("PRAGMA foreign_keys = ON;");
            stmt.execute("PRAGMA busy_timeout = 5000;");
        }
        return conn;
    }

    /**
     * Initializes the SQLite database file, executes schema.sql and seed.sql if tables are empty.
     */
    public static synchronized boolean initializeDatabase() {
        if (initialized) return true;
        if (!driverAvailable) return false;

        try {
            File dir = new File(DB_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            try (Connection conn = getConnection()) {
                // 1. Run schema.sql
                File schemaFile = locateSqlFile("sql/schema.sql");
                if (schemaFile != null && schemaFile.exists()) {
                    executeSqlScript(conn, schemaFile);
                } else {
                    System.err.println("[DatabaseManager] Warning: sql/schema.sql not found.");
                }

                // 1b. Safe incremental migration for fee columns
                try (Statement stmt = conn.createStatement()) {
                    try { stmt.execute("ALTER TABLE reservations ADD COLUMN hourly_rate REAL DEFAULT 50.0;"); } catch (SQLException ignored) {}
                    try { stmt.execute("ALTER TABLE reservations ADD COLUMN duration_minutes INTEGER DEFAULT 120;"); } catch (SQLException ignored) {}
                    try { stmt.execute("ALTER TABLE reservations ADD COLUMN total_cost REAL DEFAULT 100.0;"); } catch (SQLException ignored) {}
                } catch (Exception ignored) {}

                // 2. Check if parking_lots table is empty, if so run seed.sql
                boolean needsSeed = false;
                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM parking_lots")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        needsSeed = true;
                    }
                } catch (SQLException ignored) {
                    needsSeed = true;
                }

                if (needsSeed) {
                    File seedFile = locateSqlFile("sql/seed.sql");
                    if (seedFile != null && seedFile.exists()) {
                        executeSqlScript(conn, seedFile);
                        System.out.println("[DatabaseManager] Database initialized and seeded successfully.");
                    }
                } else {
                    System.out.println("[DatabaseManager] Database connected. Existing schema & data verified.");
                }

                initialized = true;
                return true;
            }
        } catch (Exception e) {
            System.err.println("[DatabaseManager] Error initializing database: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Re-runs schema and seed scripts unconditionally (e.g. for db:reset or db:setup).
     */
    public static synchronized boolean reinitializeDatabase(boolean dropExisting) {
        if (!driverAvailable) return false;
        try {
            File dir = new File(DB_DIR);
            if (!dir.exists()) dir.mkdirs();

            try (Connection conn = getConnection()) {
                if (dropExisting) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute("PRAGMA foreign_keys = OFF;");
                        String[] tables = {"reservations", "waiting_queue", "parking_spaces", "parking_lots", "road_edges", "road_nodes", "users", "vehicles", "system_settings"};
                        for (String t : tables) {
                            try {
                                stmt.execute("DROP TABLE IF EXISTS " + t);
                            } catch (SQLException ignored) {}
                        }
                        stmt.execute("PRAGMA foreign_keys = ON;");
                    }
                }

                File schemaFile = locateSqlFile("sql/schema.sql");
                if (schemaFile != null && schemaFile.exists()) {
                    executeSqlScript(conn, schemaFile);
                }

                File seedFile = locateSqlFile("sql/seed.sql");
                if (seedFile != null && seedFile.exists()) {
                    executeSqlScript(conn, seedFile);
                }

                initialized = true;
                return true;
            }
        } catch (Exception e) {
            System.err.println("[DatabaseManager] Error reinitializing database: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private static File locateSqlFile(String relativePath) {
        File f = new File(relativePath);
        if (f.exists()) return f;
        f = new File("../" + relativePath);
        if (f.exists()) return f;
        return null;
    }

    private static void executeSqlScript(Connection conn, File scriptFile) throws IOException, SQLException {
        String content = Files.readString(scriptFile.toPath());
        StringBuilder cleaned = new StringBuilder();
        for (String line : content.split("\\R")) {
            String trimmedLine = line.trim();
            if (!trimmedLine.startsWith("--")) {
                cleaned.append(line).append("\n");
            }
        }
        String[] statements = cleaned.toString().split(";");

        try (Statement stmt = conn.createStatement()) {
            for (String sql : statements) {
                String trimmed = sql.trim();
                if (!trimmed.isEmpty()) {
                    try {
                        stmt.execute(trimmed);
                    } catch (SQLException ex) {
                        if (!ex.getMessage().contains("already exists")) {
                            System.err.println("[DatabaseManager] Script warning on: " + trimmed.substring(0, Math.min(40, trimmed.length())) + "... -> " + ex.getMessage());
                        }
                    }
                }
            }
        }
    }

    /**
     * Standalone CLI entrypoint to run the project's SQL schema and seed files directly.
     * Usage:
     *   java -cp "bin;lib/*" db.DatabaseManager [--reset]
     */
    public static void main(String[] args) {
        boolean reset = false;
        for (String arg : args) {
            if ("--reset".equalsIgnoreCase(arg) || "-r".equalsIgnoreCase(arg) || "--force".equalsIgnoreCase(arg)) {
                reset = true;
            }
        }

        System.out.println("==========================================================================");
        System.out.println("  IDAM NAGAR SMART PARKING SYSTEM — SQL RUNNER & MIGRATOR                ");
        System.out.println("  Target Database: data/smart_parking.db (SQLite)                        ");
        System.out.println("  Scripts: sql/schema.sql & sql/seed.sql                                 ");
        System.out.println("==========================================================================\n");

        if (!driverAvailable) {
            System.err.println("[ERROR] SQLite JDBC Driver not found in classpath (lib/sqlite-jdbc-*.jar).");
            System.exit(1);
        }

        System.out.println("Executing SQL migration and seed scripts...");
        boolean success = reset ? reinitializeDatabase(true) : initializeDatabase();

        if (success) {
            System.out.println("\n>>> SQL SCRIPTS EXECUTED SUCCESSFULLY! <<<");
            try (Connection conn = getConnection();
                 Statement stmt = conn.createStatement()) {
                System.out.println("\nDatabase Table Summary:");
                try (ResultSet rs = stmt.executeQuery(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")) {
                    while (rs.next()) {
                        String table = rs.getString("name");
                        try (Statement cntStmt = conn.createStatement();
                             ResultSet cntRs = cntStmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
                            int count = cntRs.next() ? cntRs.getInt(1) : 0;
                            System.out.printf("   * %-20s : %d rows%n", table, count);
                        }
                    }
                }
            } catch (SQLException e) {
                System.err.println("Warning inspecting tables: " + e.getMessage());
            }
            System.out.println("\nProject is ready with SQL persistence enabled.");
        } else {
            System.err.println("\n[ERROR] Failed to execute SQL scripts.");
            System.exit(1);
        }
    }
}
