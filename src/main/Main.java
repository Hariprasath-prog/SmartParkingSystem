package main;

import graph.DijkstraAlgorithm;
import graph.DijkstraAlgorithm.ShortestPathResult;
import graph.WeightedGraph;
import model.AccessibleSpace;
import model.CarSpace;
import model.ParkingLot;
import model.ParkingRequest;
import model.ParkingSpace;
import model.Reservation;
import model.TwoWheelerSpace;
import model.Vehicle;
import model.VehicleType;
import service.ParkingOperationsController;
import service.ParkingOperationsController.AllocationResult;
import util.SampleData;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Main console application entry point for the Smart Parking Allocation System (Idam Nagar).
 * Implements role-based console menus, graceful input error handling, and demo execution.
 */
public class Main {

    private static final Scanner scanner = new Scanner(System.in);
    private static ParkingOperationsController controller;

    public static void main(String[] args) {
        // Initialize road graph, 3 lots, 24 spaces, and vehicle catalog
        WeightedGraph roadNetwork = SampleData.createRoadNetwork();
        controller = new ParkingOperationsController(roadNetwork);
        SampleData.initializeSystemData(controller);

        System.out.println("====================================================================");
        System.out.println("   SMART PARKING ALLOCATION SYSTEM - IDAM NAGAR COMMERCIAL DISTRICT  ");
        System.out.println("====================================================================");

        boolean running = true;
        while (running) {
            displayRoleSelectionMenu();
            int choice = readInt("Enter your choice (1-5): ", 1, 5);

            switch (choice) {
                case 1:
                    runUserMenu();
                    break;
                case 2:
                    runAdminMenu();
                    break;
                case 3:
                    // Academic Viva / Automated test suite demo
                    SampleData.run20EventsSimulation(controller);
                    break;
                case 4:
                    viewRoadNetworkAndShortestPaths();
                    break;
                case 5:
                    System.out.println("\nThank you for using the Smart Parking Allocation System. Exiting...");
                    running = false;
                    break;
                default:
                    System.out.println("Invalid option. Please try again.");
            }
        }
        scanner.close();
    }

    // ==========================================
    // ROLE SELECTION
    // ==========================================

    private static void displayRoleSelectionMenu() {
        System.out.println("\n------------------------------------------------");
        System.out.println("MAIN ROLE SELECTION & CONTROL");
        System.out.println("Simulated System Time: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
        System.out.println("------------------------------------------------");
        System.out.println("1. Login as Driver / User");
        System.out.println("2. Login as Parking Administrator");
        System.out.println("3. Run 20 Automated Simulation Events & Test Suite");
        System.out.println("4. View Road Network Graph & Dijkstra Paths");
        System.out.println("5. Exit System");
    }

    // ==========================================
    // USER / DRIVER MENU
    // ==========================================

    private static void runUserMenu() {
        boolean inUserMenu = true;
        while (inUserMenu) {
            System.out.println("\n====================================");
            System.out.println("        DRIVER / USER MENU          ");
            System.out.println("Simulated Clock: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
            System.out.println("====================================");
            System.out.println("1. Book Parking (Compatible Nearest Lot)");
            System.out.println("2. Cancel Reservation");
            System.out.println("3. Find Nearest Parking Lot (Dijkstra)");
            System.out.println("4. Check-in (Arrival)");
            System.out.println("5. Check-out (Departure)");
            System.out.println("6. View My Reservation");
            System.out.println("7. View Parking Status");
            System.out.println("8. View Waiting List");
            System.out.println("9. Return to Main Menu");

            int choice = readInt("Select an option (1-9): ", 1, 9);
            switch (choice) {
                case 1:
                    handleBookParking();
                    break;
                case 2:
                    handleCancelReservation();
                    break;
                case 3:
                    handleFindNearestLot();
                    break;
                case 4:
                    handleCheckIn();
                    break;
                case 5:
                    handleCheckOut();
                    break;
                case 6:
                    handleViewMyReservation();
                    break;
                case 7:
                    displayParkingStatus();
                    break;
                case 8:
                    displayWaitingList();
                    break;
                case 9:
                    inUserMenu = false;
                    break;
                default:
                    System.out.println("Invalid option.");
            }
        }
    }

    // ==========================================
    // ADMIN MENU
    // ==========================================

    private static void runAdminMenu() {
        boolean inAdminMenu = true;
        while (inAdminMenu) {
            System.out.println("\n====================================");
            System.out.println("     PARKING ADMINISTRATOR MENU     ");
            System.out.println("Simulated Clock: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
            System.out.println("====================================");
            System.out.println("1. Add Parking Lot");
            System.out.println("2. View Parking Lots");
            System.out.println("3. Add Parking Space");
            System.out.println("4. View All Spaces");
            System.out.println("5. View Reservations");
            System.out.println("6. View Occupancy Status");
            System.out.println("7. Process Expired Reservations (Grace Period)");
            System.out.println("8. View Waiting List");
            System.out.println("9. Advance / Set Simulated Clock");
            System.out.println("10. Return to Main Menu");

            int choice = readInt("Select an option (1-10): ", 1, 10);
            switch (choice) {
                case 1:
                    handleAddParkingLot();
                    break;
                case 2:
                    displayParkingLots();
                    break;
                case 3:
                    handleAddParkingSpace();
                    break;
                case 4:
                    displayAllSpaces();
                    break;
                case 5:
                    displayAllReservations();
                    break;
                case 6:
                    displayDetailedOccupancy();
                    break;
                case 7:
                    handleProcessExpiredReservations();
                    break;
                case 8:
                    displayWaitingList();
                    break;
                case 9:
                    handleClockManagement();
                    break;
                case 10:
                    inAdminMenu = false;
                    break;
                default:
                    System.out.println("Invalid option.");
            }
        }
    }

    // =========================================================================
    // USER ACTIONS IMPLEMENTATION
    // =========================================================================

    private static void handleBookParking() {
        System.out.println("\n--- BOOK PARKING SPACE ---");
        String vehicleId = readString("Enter Vehicle Registration ID (e.g. TN-01-AB-1234): ").toUpperCase();

        Vehicle vehicle = controller.getVehicle(vehicleId);
        if (vehicle == null) {
            System.out.println("Vehicle not found in registry. Quick registration:");
            String owner = readString("Enter Owner Name: ");
            System.out.println("1. CAR\n2. TWO_WHEELER");
            int typeChoice = readInt("Select Vehicle Type (1-2): ", 1, 2);
            VehicleType type = (typeChoice == 1) ? VehicleType.CAR : VehicleType.TWO_WHEELER;
            boolean hasPermit = readYesNo("Does vehicle have an authorized Accessible Parking Permit? (Y/N): ");

            vehicle = new Vehicle(vehicleId, owner, type, hasPermit);
            controller.registerVehicle(vehicle);
            System.out.println("Vehicle successfully registered: " + vehicle);
        } else {
            System.out.println("Identified Vehicle: " + vehicle);
        }

        System.out.println("\nRoad Network Nodes available: N1 to N9");
        System.out.println("(N1: North Gateway, N2: Market, N3: Civic Centre, N4: Tech Blvd, N5: Central Sq,");
        System.out.println(" N6: Lot A, N7: Financial Dist, N8: Lot B, N9: Lot C)");
        String originNode = readString("Enter your current road node (e.g. N1): ").toUpperCase();
        if (!controller.getRoadNetwork().hasNode(originNode)) {
            System.out.println("Warning: Node " + originNode + " not found. Defaulting to N1.");
            originNode = "N1";
        }

        int startMin = readTimeMinutes("Enter requested start time (HH:MM or minutes 0-1439, e.g. 09:00): ");
        int endMin = readTimeMinutes("Enter requested end time (HH:MM or minutes 0-1439, e.g. 11:00): ");

        if (startMin >= endMin) {
            System.out.println("Error: End time must be strictly after start time.");
            return;
        }

        int priority = vehicle.hasAccessiblePermit() ? 1 : 2;
        System.out.println("\nProcessing allocation request through multi-step rule engine...");
        AllocationResult result = controller.requestParkingAllocation(
                vehicle.getVehicleId(), originNode, startMin, endMin, priority);

        if (result.isSuccess()) {
            System.out.println("\n=======================================================");
            System.out.println("          PARKING ALLOCATION SUCCESSFUL!               ");
            System.out.println("=======================================================");
            System.out.println("Reservation ID   : " + result.getReservation().getReservationId());
            System.out.println("Selected Lot     : " + result.getSelectedLot().getLotName() +
                    " (" + result.getSelectedLot().getLotId() + ")");
            System.out.println("Assigned Space   : " + result.getSelectedSpace().getSpaceId() +
                    " [Type: " + result.getSelectedSpace().getSpaceType() + "]");
            System.out.println("Time Interval    : " + Reservation.formatTime(startMin) + " - " + Reservation.formatTime(endMin));
            System.out.println("Estimated Travel : " + result.getTravelTimeMinutes() + " mins (via Dijkstra)");
            System.out.println("Shortest Route   : " + result.getTravelRoute());
            System.out.println("=======================================================");
        } else if (result.getQueuedRequest() != null) {
            System.out.println("\n[!] " + result.getMessage());
            System.out.println("Your Request ID is: " + result.getQueuedRequest().getRequestId());
            System.out.println("You will be automatically allocated as soon as a compatible space is freed.");
        } else {
            System.out.println("\n[X] Allocation Failed: " + result.getMessage());
        }
    }

    private static void handleCancelReservation() {
        System.out.println("\n--- CANCEL RESERVATION ---");
        String resId = readString("Enter Reservation ID to cancel (e.g. RES-1001): ").toUpperCase();

        try {
            Reservation cancelled = controller.cancelReservation(resId);
            System.out.println("\n=======================================================");
            System.out.println("Reservation " + cancelled.getReservationId() + " successfully CANCELLED.");
            System.out.println("Parking Space " + cancelled.getSpace().getSpaceId() + " is now AVAILABLE.");
            System.out.println("Triggered waiting list reconsideration automatically.");
            System.out.println("=======================================================");
        } catch (Exception e) {
            System.out.println("[X] Cancellation Error: " + e.getMessage());
        }
    }

    private static void handleFindNearestLot() {
        System.out.println("\n--- FIND NEAREST PARKING LOT (DIJKSTRA) ---");
        String originNode = readString("Enter your current road node (N1 to N9): ").toUpperCase();
        if (!controller.getRoadNetwork().hasNode(originNode)) {
            System.out.println("[X] Error: Node " + originNode + " does not exist in Idam Nagar network.");
            return;
        }

        System.out.println("\nCalculating shortest paths via Dijkstra algorithm with Min-Heap...");
        Map<String, ShortestPathResult> paths = DijkstraAlgorithm.computeAllShortestPaths(
                controller.getRoadNetwork(), originNode);

        System.out.printf("\n%-8s %-25s %-12s %-15s %s\n", "Lot ID", "Lot Name", "Node", "Travel Time", "Route");
        System.out.println("----------------------------------------------------------------------------------");
        for (ParkingLot lot : controller.getAllLots()) {
            ShortestPathResult res = paths.get(lot.getLocationNode());
            if (res != null && res.isReachable()) {
                System.out.printf("%-8s %-25s %-12s %-15s %s\n",
                        lot.getLotId(), lot.getLotName(), lot.getLocationNode(),
                        res.getTravelTimeMinutes() + " mins", res.getPathString());
            } else {
                System.out.printf("%-8s %-25s %-12s %-15s %s\n",
                        lot.getLotId(), lot.getLotName(), lot.getLocationNode(), "UNREACHABLE", "N/A");
            }
        }
    }

    private static void handleCheckIn() {
        System.out.println("\n--- VEHICLE CHECK-IN ---");
        String resId = readString("Enter Reservation ID (e.g. RES-1001): ").toUpperCase();
        String vehicleId = readString("Enter Vehicle ID for verification: ").toUpperCase();

        try {
            Reservation res = controller.checkIn(resId, vehicleId);
            System.out.println("\n=======================================================");
            System.out.println("Check-in Confirmed!");
            System.out.println("Reservation : " + res.getReservationId() + " -> Status: " + res.getStatus());
            System.out.println("Space       : " + res.getSpace().getSpaceId() + " -> Status: " + res.getSpace().getStatus());
            System.out.println("Welcome to " + res.getSpace().getLotId() + "! Gate barrier opened.");
            System.out.println("=======================================================");
        } catch (Exception e) {
            System.out.println("[X] Check-in Error: " + e.getMessage());
        }
    }

    private static void handleCheckOut() {
        System.out.println("\n--- VEHICLE CHECK-OUT ---");
        String resId = readString("Enter Reservation ID to check out: ").toUpperCase();

        try {
            Reservation res = controller.checkOut(resId);
            System.out.println("\n=======================================================");
            System.out.println("Check-out Confirmed!");
            System.out.println("Reservation : " + res.getReservationId() + " -> Status: " + res.getStatus());
            System.out.println("Space       : " + res.getSpace().getSpaceId() + " -> Status: " + res.getSpace().getStatus());
            System.out.println("Space successfully released back to AVAILABLE.");
            System.out.println("Waiting list reconsideration was automatically triggered.");
            System.out.println("Have a safe journey!");
            System.out.println("=======================================================");
        } catch (Exception e) {
            System.out.println("[X] Check-out Error: " + e.getMessage());
        }
    }

    private static void handleViewMyReservation() {
        System.out.println("\n--- VIEW MY RESERVATION ---");
        String vehicleId = readString("Enter your Vehicle ID: ").toUpperCase();

        List<Reservation> userResList = controller.getReservationManager().getReservationsByVehicle(vehicleId);
        if (userResList.isEmpty()) {
            System.out.println("No reservations found for vehicle " + vehicleId);
            return;
        }

        System.out.println("\nFound " + userResList.size() + " reservation(s):");
        for (Reservation res : userResList) {
            System.out.println("  " + res);
        }
    }

    private static void displayParkingStatus() {
        System.out.println("\n================ IDAM NAGAR PARKING STATUS ================");
        for (ParkingLot lot : controller.getAllLots()) {
            System.out.println(lot);
        }
        System.out.println("===========================================================");
    }

    private static void displayWaitingList() {
        System.out.println("\n================ PRIORITY QUEUE WAITING LIST ================");
        List<ParkingRequest> waiting = controller.getWaitingRequests();
        if (waiting.isEmpty()) {
            System.out.println("Waiting list is currently empty. All drivers accommodated!");
        } else {
            System.out.println("Ranked by: 1) Access Priority  2) Arrival Time (Deterministic Min-Heap)");
            int rank = 1;
            for (ParkingRequest req : waiting) {
                System.out.printf("Rank #%d: %s\n", rank++, req);
            }
        }
        System.out.println("=============================================================");
    }

    // =========================================================================
    // ADMIN ACTIONS IMPLEMENTATION
    // =========================================================================

    private static void handleAddParkingLot() {
        System.out.println("\n--- ADD PARKING LOT ---");
        String lotId = readString("Enter new Lot ID (e.g. LOT-D): ").toUpperCase();
        if (controller.getLot(lotId) != null) {
            System.out.println("[X] Error: Lot " + lotId + " already exists.");
            return;
        }
        String lotName = readString("Enter Lot Name: ");
        String node = readString("Enter road network Node ID (e.g. N5): ").toUpperCase();

        if (!controller.getRoadNetwork().hasNode(node)) {
            System.out.println("Node " + node + " does not exist in graph. Adding node to road network first...");
            controller.getRoadNetwork().addNode(node, lotName + " Access");
        }

        ParkingLot lot = new ParkingLot(lotId, lotName, node);
        controller.addParkingLot(lot);
        System.out.println("Parking Lot " + lotId + " successfully added!");
    }

    private static void displayParkingLots() {
        System.out.println("\n================ ALL PARKING LOTS ================");
        for (ParkingLot lot : controller.getAllLots()) {
            System.out.println(lot);
        }
        System.out.println("==================================================");
    }

    private static void handleAddParkingSpace() {
        System.out.println("\n--- ADD PARKING SPACE ---");
        String lotId = readString("Enter Lot ID to add space to: ").toUpperCase();
        ParkingLot lot = controller.getLot(lotId);
        if (lot == null) {
            System.out.println("[X] Error: Lot " + lotId + " not found.");
            return;
        }

        String spaceId = readString("Enter unique Space ID (e.g. A-C06): ").toUpperCase();
        if (controller.getSpace(spaceId) != null) {
            System.out.println("[X] Error: Space " + spaceId + " already exists.");
            return;
        }

        System.out.println("Space Type: 1. Car  2. Two-Wheeler  3. Accessible");
        int typeChoice = readInt("Select Type (1-3): ", 1, 3);
        ParkingSpace space;
        switch (typeChoice) {
            case 1:
                space = new CarSpace(spaceId, lotId);
                break;
            case 2:
                space = new TwoWheelerSpace(spaceId, lotId);
                break;
            case 3:
                space = new AccessibleSpace(spaceId, lotId);
                break;
            default:
                space = new CarSpace(spaceId, lotId);
        }

        controller.addParkingSpace(space, lotId);
        System.out.println("Space " + spaceId + " (" + space.getSpaceType() + ") added to " + lotId + ".");
    }

    private static void displayAllSpaces() {
        System.out.println("\n================ ALL PARKING SPACES ================");
        for (ParkingSpace space : controller.getAllSpaces()) {
            System.out.println(space);
        }
        System.out.println("Total Spaces: " + controller.getAllSpaces().size());
        System.out.println("====================================================");
    }

    private static void displayAllReservations() {
        System.out.println("\n================ ALL SYSTEM RESERVATIONS ================");
        List<Reservation> all = controller.getAllReservations();
        if (all.isEmpty()) {
            System.out.println("No reservations recorded yet.");
        } else {
            for (Reservation res : all) {
                System.out.println(res);
            }
        }
        System.out.println("=========================================================");
    }

    private static void displayDetailedOccupancy() {
        System.out.println("\n================ REAL-TIME OCCUPANCY DASHBOARD ================");
        int totalSpaces = controller.getAllSpaces().size();
        int available = 0;
        int reserved = 0;
        int occupied = 0;

        for (ParkingSpace s : controller.getAllSpaces()) {
            if (s.isAvailable()) available++;
            else if (s.isReserved()) reserved++;
            else if (s.isOccupied()) occupied++;
        }

        System.out.printf("Total Inventory : %d Spaces across %d Facilities\n",
                totalSpaces, controller.getAllLots().size());
        System.out.printf("Available       : %d (%.1f%%)\n", available, (available * 100.0 / totalSpaces));
        System.out.printf("Reserved        : %d (%.1f%%)\n", reserved, (reserved * 100.0 / totalSpaces));
        System.out.printf("Occupied        : %d (%.1f%%)\n", occupied, (occupied * 100.0 / totalSpaces));
        System.out.println("----------------------------------------------------------------");
        for (ParkingLot lot : controller.getAllLots()) {
            System.out.println("Lot " + lot.getLotId() + " (" + lot.getLotName() + "):");
            System.out.printf("   Car Spaces: %d | Two-Wheeler: %d | Accessible: %d\n",
                    lot.getSpacesByType("CAR").size(),
                    lot.getSpacesByType("TWO_WHEELER").size(),
                    lot.getSpacesByType("ACCESSIBLE").size());
        }
        System.out.println("================================================================");
    }

    private static void handleProcessExpiredReservations() {
        System.out.println("\n--- PROCESS EXPIRED RESERVATIONS ---");
        System.out.println("Current Clock: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
        System.out.println("Allowed Grace Period: " + ParkingOperationsController.DEFAULT_GRACE_PERIOD_MINUTES + " minutes.");

        List<Reservation> expired = controller.processExpiredReservations(
                ParkingOperationsController.DEFAULT_GRACE_PERIOD_MINUTES);

        if (expired.isEmpty()) {
            System.out.println("No reservations have exceeded the grace period.");
        } else {
            System.out.println("Processed " + expired.size() + " expired reservation(s):");
            for (Reservation res : expired) {
                System.out.printf("  [EXPIRED] %s on Space %s (Lot %s). Space is now AVAILABLE.\n",
                        res.getReservationId(), res.getSpace().getSpaceId(), res.getSpace().getLotId());
            }
            System.out.println("Waiting list reconsideration was automatically triggered.");
        }
    }

    private static void handleClockManagement() {
        System.out.println("\n--- SIMULATED CLOCK MANAGEMENT ---");
        System.out.println("Current Time: " + Reservation.formatTime(controller.getCurrentSimulatedTime()) +
                " (" + controller.getCurrentSimulatedTime() + " mins from midnight)");
        System.out.println("1. Advance Clock by X Minutes");
        System.out.println("2. Set Specific Time (HH:MM)");

        int choice = readInt("Select option (1-2): ", 1, 2);
        if (choice == 1) {
            int advance = readInt("Enter minutes to advance (e.g. 15, 30, 60): ", 1, 1440);
            controller.advanceSimulatedTime(advance);
            System.out.println("Clock advanced to: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
        } else {
            int time = readTimeMinutes("Enter new time (HH:MM, e.g. 10:30): ");
            controller.setSimulatedTime(time);
            System.out.println("Clock set to: " + Reservation.formatTime(controller.getCurrentSimulatedTime()));
        }
    }

    private static void viewRoadNetworkAndShortestPaths() {
        controller.getRoadNetwork().printGraph();
    }

    // ==========================================
    // ROBUST CONSOLE INPUT HELPERS
    // ==========================================

    private static int readInt(String prompt, int min, int max) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim();
            try {
                int val = Integer.parseInt(line);
                if (val >= min && val <= max) {
                    return val;
                }
                System.out.printf("Please enter a number between %d and %d.\n", min, max);
            } catch (NumberFormatException e) {
                System.out.println("Invalid numeric input. Please try again.");
            }
        }
    }

    private static String readString(String prompt) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim();
            if (!line.isEmpty()) {
                return line;
            }
            System.out.println("Input cannot be blank.");
        }
    }

    private static boolean readYesNo(String prompt) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim().toUpperCase();
            if (line.equals("Y") || line.equals("YES")) return true;
            if (line.equals("N") || line.equals("NO")) return false;
            System.out.println("Please enter 'Y' or 'N'.");
        }
    }

    private static int readTimeMinutes(String prompt) {
        while (true) {
            System.out.print(prompt);
            String input = scanner.nextLine().trim();
            if (input.contains(":")) {
                String[] parts = input.split(":");
                try {
                    int h = Integer.parseInt(parts[0].trim());
                    int m = Integer.parseInt(parts[1].trim());
                    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                        return h * 60 + m;
                    }
                } catch (Exception ignored) {
                }
            } else {
                try {
                    int totalMins = Integer.parseInt(input);
                    if (totalMins >= 0 && totalMins < 1440) {
                        return totalMins;
                    }
                } catch (Exception ignored) {
                }
            }
            System.out.println("Invalid time format. Please enter either HH:MM (e.g. 09:30) or total minutes (0-1439).");
        }
    }
}
