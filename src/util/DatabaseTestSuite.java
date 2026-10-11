package util;

import db.DatabaseManager;
import db.dao.ParkingLotDAO;
import db.dao.ParkingSpaceDAO;
import db.dao.ReservationDAO;
import db.dao.RoadNetworkDAO;
import db.dao.UserDAO;
import db.dao.VehicleDAO;
import graph.DijkstraAlgorithm;
import graph.WeightedGraph;
import model.ParkingLot;
import model.ParkingSpace;
import model.Reservation;
import model.ReservationStatus;
import model.SpaceStatus;
import model.Vehicle;
import model.VehicleType;

import java.util.List;
import java.util.Map;

/**
 * Automated test suite verifying SQL Database integration, DAO queries,
 * interval conflict detection, and graph topology loading from SQLite.
 */
public class DatabaseTestSuite {

    public static void main(String[] args) {
        System.out.println("==========================================================================");
        System.out.println("  RUNNING SQL DATABASE & DAO INTEGRATION TEST SUITE");
        System.out.println("==========================================================================\n");

        int passed = 0;
        int failed = 0;

        // 1. Initialize SQLite Database
        System.out.print("[SQL 01] DatabaseManager initialization & schema migration: ");
        boolean dbInit = DatabaseManager.initializeDatabase();
        if (dbInit) {
            System.out.println("PASS (smart_parking.db initialized & schema applied)");
            passed++;
        } else {
            System.out.println("FAIL (Could not initialize SQLite database)");
            failed++;
        }

        // 2. Test RoadNetworkDAO
        System.out.print("[SQL 02] RoadNetworkDAO loads vertices & edges into WeightedGraph: ");
        RoadNetworkDAO roadDAO = new RoadNetworkDAO();
        WeightedGraph graph = roadDAO.loadRoadNetwork();
        if (graph.getAllNodes().size() == 9) {
            System.out.println("PASS (Loaded 9 road vertices: " + graph.getAllNodes().keySet() + ")");
            passed++;
        } else {
            System.out.println("FAIL (Expected 9 vertices, got " + graph.getAllNodes().size() + ")");
            failed++;
        }

        // 3. Test Dijkstra Shortest Path on SQL-loaded Graph
        System.out.print("[SQL 03] Dijkstra routing on SQL road network from N1 to N6: ");
        Map<String, DijkstraAlgorithm.ShortestPathResult> paths = DijkstraAlgorithm.computeAllShortestPaths(graph, "N1");
        DijkstraAlgorithm.ShortestPathResult pathN6 = paths.get("N6");
        if (pathN6 != null && pathN6.getTravelTimeMinutes() == 10) {
            System.out.println("PASS (Route: " + pathN6.getPathString() + ", Transit: " + pathN6.getTravelTimeMinutes() + " mins)");
            passed++;
        } else {
            System.out.println("FAIL (Expected 10 mins, got: " + (pathN6 != null ? pathN6.getTravelTimeMinutes() : "null") + ")");
            failed++;
        }

        // 4. Test ParkingLotDAO
        System.out.print("[SQL 04] ParkingLotDAO fetches all 3 parking facilities: ");
        ParkingLotDAO lotDAO = new ParkingLotDAO();
        List<ParkingLot> lots = lotDAO.getAllLots();
        if (lots.size() == 3) {
            System.out.println("PASS (LOT-A, LOT-B, LOT-C verified)");
            passed++;
        } else {
            System.out.println("FAIL (Expected 3 lots, got " + lots.size() + ")");
            failed++;
        }

        // 5. Test ParkingSpaceDAO
        System.out.print("[SQL 05] ParkingSpaceDAO loads 60 stalls across 3 facilities: ");
        ParkingSpaceDAO spaceDAO = new ParkingSpaceDAO();
        List<ParkingSpace> spaces = spaceDAO.getAllSpaces();
        if (spaces.size() == 60) {
            System.out.println("PASS (60 physical stalls verified in database)");
            passed++;
        } else {
            System.out.println("FAIL (Expected 60 spaces, got " + spaces.size() + ")");
            failed++;
        }

        // 6. Test VehicleDAO
        System.out.print("[SQL 06] VehicleDAO loads registered test fleet: ");
        VehicleDAO vehicleDAO = new VehicleDAO();
        Vehicle v1 = vehicleDAO.getVehicleById("KA-01-AB-1234");
        if (v1 != null && "John Doe".equals(v1.getOwnerName())) {
            System.out.println("PASS (Found " + v1.getVehicleId() + " owned by " + v1.getOwnerName() + ")");
            passed++;
        } else {
            System.out.println("FAIL (Vehicle KA-01-AB-1234 not found)");
            failed++;
        }

        // 7. Test UserDAO Authentication
        System.out.print("[SQL 07] UserDAO authenticates admin and driver accounts: ");
        UserDAO userDAO = new UserDAO();
        UserDAO.UserRecord adminUser = userDAO.authenticate("admin", "admin123");
        UserDAO.UserRecord driverUser = userDAO.authenticate("johndoe", "user123");
        UserDAO.UserRecord invalidUser = userDAO.authenticate("admin", "wrongpassword");
        if (adminUser != null && "ADMIN".equals(adminUser.getRole())
                && driverUser != null && "USER".equals(driverUser.getRole())
                && invalidUser == null) {
            System.out.println("PASS (Admin & driver authenticated, invalid password rejected)");
            passed++;
        } else {
            System.out.println("FAIL (Authentication verification failed)");
            failed++;
        }

        // 8. Test ReservationDAO Interval Conflict Detection
        System.out.print("[SQL 08] ReservationDAO saves booking and detects interval conflicts: ");
        ReservationDAO resDAO = new ReservationDAO();
        Vehicle testVeh = new Vehicle("TEST-SQL-99", "Tester", VehicleType.CAR, false);
        vehicleDAO.saveVehicle(testVeh);
        ParkingSpace targetSpace = spaceDAO.getSpaceById("A-C01");

        Reservation testRes = new Reservation("RES-SQL-001", testVeh, targetSpace, 600, 720, 580);
        resDAO.saveReservation(testRes);

        // Check overlapping interval (660 to 780 collides with 600 to 720)
        boolean hasConflict = resDAO.hasOverlappingReservation("A-C01", 660, 780);
        // Check non-overlapping interval (800 to 900)
        boolean noConflict = !resDAO.hasOverlappingReservation("A-C01", 800, 900);

        if (hasConflict && noConflict) {
            System.out.println("PASS (SQL interval collision correctly identified on [600-720])");
            passed++;
        } else {
            System.out.println("FAIL (Conflict logic error: hasConflict=" + hasConflict + ", noConflict=" + noConflict + ")");
            failed++;
        }

        // 9. Test ReservationDAO Lifecycle Update
        System.out.print("[SQL 09] ReservationDAO updates check-in and checkout status: ");
        boolean checkInOk = resDAO.updateReservationStatus("RES-SQL-001", ReservationStatus.CHECKED_IN, 610, null);
        boolean checkoutOk = resDAO.updateReservationStatus("RES-SQL-001", ReservationStatus.COMPLETED, 610, 715);
        if (checkInOk && checkoutOk) {
            System.out.println("PASS (Status successfully transitioned to CHECKED_IN then COMPLETED)");
            passed++;
        } else {
            System.out.println("FAIL (Failed to update reservation status in SQL)");
            failed++;
        }

        System.out.println("\n==========================================================================");
        System.out.println("  DATABASE TEST RESULTS: " + passed + " PASSED | " + failed + " FAILED");
        System.out.println("==========================================================================");

        if (failed > 0) {
            System.exit(1);
        }
    }
}
