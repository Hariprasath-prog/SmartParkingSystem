import model.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;

public class Main {

    static Scanner scanner = new Scanner(System.in);

    static HashMap<String, Vehicle> vehicles =
            new HashMap<>();

    static HashMap<String, ParkingLot> parkingLots =
            new HashMap<>();

    static HashMap<String, Reservation> reservations =
            new HashMap<>();

    static ArrayList<ParkingRequest> requests =
            new ArrayList<>();

    public static void main(String[] args) {

        while (true) {

            displayMenu();

            int choice = readInt("Enter your choice: ");

            switch (choice) {

                case 1:
                    addParkingLot();
                    break;

                case 2:
                    addParkingSpace();
                    break;

                case 3:
                    registerVehicle();
                    break;

                case 4:
                    displayParkingLots();
                    break;

                case 5:
                    displayAllSpaces();
                    break;

                case 6:
                    createParkingRequest();
                    break;

                case 7:
                    createReservation();
                    break;

                case 8:
                    displayReservations();
                    break;

                case 9:
                    checkIn();
                    break;

                case 10:
                    cancelReservation();
                    break;

                case 11:
                    checkOut();
                    break;

                case 12:
                    displayVehicles();
                    break;

                case 0:
                    System.out.println(
                            "\nThank you for using Smart Parking System."
                    );
                    scanner.close();
                    return;

                default:
                    System.out.println(
                            "Invalid choice. Try again."
                    );
            }
        }
    }

    // ================= MENU =================

    static void displayMenu() {

        System.out.println("\n======================================");
        System.out.println("     SMART PARKING ALLOCATION SYSTEM");
        System.out.println("======================================");

        System.out.println("1. Add Parking Lot");
        System.out.println("2. Add Parking Space");
        System.out.println("3. Register Vehicle");
        System.out.println("4. View Parking Lots");
        System.out.println("5. View Parking Spaces");
        System.out.println("6. Create Parking Request");
        System.out.println("7. Create Reservation");
        System.out.println("8. View Reservations");
        System.out.println("9. Check In");
        System.out.println("10. Cancel Reservation");
        System.out.println("11. Check Out");
        System.out.println("12. View Vehicles");
        System.out.println("0. Exit");

        System.out.println("======================================");
    }

    // ================= PARKING LOT =================

    static void addParkingLot() {

        System.out.println("\n--- ADD PARKING LOT ---");

        String id = readString("Enter Lot ID: ");

        if (parkingLots.containsKey(id)) {

            System.out.println(
                    "Parking lot already exists."
            );
            return;
        }

        String name = readString("Enter Lot Name: ");
        String location = readString("Enter Location/Node: ");

        ParkingLot lot =
                new ParkingLot(id, name, location);

        parkingLots.put(id, lot);

        System.out.println(
                "Parking lot added successfully."
        );
    }

    // ================= PARKING SPACE =================

    static void addParkingSpace() {

        System.out.println("\n--- ADD PARKING SPACE ---");

        if (parkingLots.isEmpty()) {

            System.out.println(
                    "Please create a parking lot first."
            );
            return;
        }

        String lotId =
                readString("Enter Parking Lot ID: ");

        ParkingLot lot = parkingLots.get(lotId);

        if (lot == null) {

            System.out.println(
                    "Parking lot not found."
            );
            return;
        }

        String spaceId =
                readString("Enter Space ID: ");

        System.out.println("\nSelect Space Type:");
        System.out.println("1. Car");
        System.out.println("2. Two-Wheeler");
        System.out.println("3. Accessible");

        int type = readInt("Enter type: ");

        ParkingSpace space;

        switch (type) {

            case 1:
                space = new CarSpace(spaceId);
                break;

            case 2:
                space = new TwoWheelerSpace(spaceId);
                break;

            case 3:
                space = new AccessibleSpace(spaceId);
                break;

            default:
                System.out.println(
                        "Invalid space type."
                );
                return;
        }

        lot.addSpace(space);

        System.out.println(
                "Parking space added successfully."
        );
    }

    // ================= VEHICLE =================

    static void registerVehicle() {

        System.out.println("\n--- REGISTER VEHICLE ---");

        String id =
                readString("Enter Vehicle ID: ");

        if (vehicles.containsKey(id)) {

            System.out.println(
                    "Vehicle already registered."
            );
            return;
        }

        String owner =
                readString("Enter Owner Name: ");

        System.out.println("\nVehicle Type:");
        System.out.println("1. Car");
        System.out.println("2. Two-Wheeler");

        int type =
                readInt("Enter vehicle type: ");

        VehicleType vehicleType;

        if (type == 1) {
            vehicleType = VehicleType.CAR;
        }
        else if (type == 2) {
            vehicleType = VehicleType.TWO_WHEELER;
        }
        else {
            System.out.println(
                    "Invalid vehicle type."
            );
            return;
        }

        boolean permit =
                readYesNo(
                        "Does the vehicle have an accessible permit? (Y/N): "
                );

        Vehicle vehicle =
                new Vehicle(
                        id,
                        owner,
                        vehicleType,
                        permit
                );

        vehicles.put(id, vehicle);

        System.out.println(
                "Vehicle registered successfully."
        );
    }

    // ================= VIEW VEHICLES =================

    static void displayVehicles() {

        System.out.println("\n--- REGISTERED VEHICLES ---");

        if (vehicles.isEmpty()) {

            System.out.println(
                    "No vehicles registered."
            );
            return;
        }

        for (Vehicle vehicle : vehicles.values()) {

            System.out.println(vehicle);
        }
    }

    // ================= VIEW LOTS =================

    static void displayParkingLots() {

        System.out.println("\n--- PARKING LOTS ---");

        if (parkingLots.isEmpty()) {

            System.out.println(
                    "No parking lots available."
            );
            return;
        }

        for (ParkingLot lot : parkingLots.values()) {

            System.out.println(lot);
        }
    }

    // ================= VIEW SPACES =================

    static void displayAllSpaces() {

        System.out.println("\n--- PARKING SPACES ---");

        if (parkingLots.isEmpty()) {

            System.out.println(
                    "No parking lots available."
            );
            return;
        }

        for (ParkingLot lot : parkingLots.values()) {

            lot.displaySpaces();
        }
    }

    // ================= PARKING REQUEST =================

    static void createParkingRequest() {

        System.out.println("\n--- PARKING REQUEST ---");

        String requestId =
                readString("Enter Request ID: ");

        String vehicleId =
                readString("Enter Vehicle ID: ");

        Vehicle vehicle =
                vehicles.get(vehicleId);

        if (vehicle == null) {

            System.out.println(
                    "Vehicle not found."
            );
            return;
        }

        int requestTime =
                readTime("Enter Request Time (HH:MM): ");

        int priority;

        if (vehicle.hasAccessiblePermit()) {
            priority = 1;
        }
        else {
            priority = 2;
        }

        ParkingRequest request =
                new ParkingRequest(
                        requestId,
                        vehicle,
                        requestTime,
                        priority
                );

        requests.add(request);

        System.out.println(
                "\nParking request created."
        );

        System.out.println(request);
    }

    // ================= RESERVATION =================

    static void createReservation() {

        System.out.println("\n--- CREATE RESERVATION ---");

        String reservationId =
                readString("Enter Reservation ID: ");

        if (reservations.containsKey(reservationId)) {

            System.out.println(
                    "Reservation ID already exists."
            );
            return;
        }

        String vehicleId =
                readString("Enter Vehicle ID: ");

        Vehicle vehicle =
                vehicles.get(vehicleId);

        if (vehicle == null) {

            System.out.println(
                    "Vehicle not found."
            );
            return;
        }

        String spaceId =
                readString("Enter Space ID: ");

        ParkingSpace space =
                findSpace(spaceId);

        if (space == null) {

            System.out.println(
                    "Parking space not found."
            );
            return;
        }

        if (!space.acceptsVehicle(vehicle)) {

            System.out.println(
                    "\nReservation rejected."
            );

            System.out.println(
                    "The selected space is not compatible "
                    + "with this vehicle."
            );

            return;
        }

        int startTime =
                readTime(
                        "Enter Start Time (HH:MM): "
                );

        int endTime =
                readTime(
                        "Enter End Time (HH:MM): "
                );

        if (startTime >= endTime) {

            System.out.println(
                    "End time must be after start time."
            );
            return;
        }

        // Check reservation conflicts

        for (Reservation reservation :
                reservations.values()) {

            if (!reservation.getSpace()
                    .getSpaceId()
                    .equals(spaceId)) {

                continue;
            }

            if (reservation.getStatus() ==
                    ReservationStatus.CANCELLED ||
                reservation.getStatus() ==
                    ReservationStatus.EXPIRED) {

                continue;
            }

            if (reservation.overlaps(
                    startTime,
                    endTime)) {

                System.out.println(
                        "\nReservation rejected."
                );

                System.out.println(
                        "Space already has an overlapping "
                        + "reservation."
                );

                System.out.println(reservation);

                return;
            }
        }

        Reservation reservation =
                new Reservation(
                        reservationId,
                        vehicle,
                        space,
                        startTime,
                        endTime
                );

        reservations.put(
                reservationId,
                reservation
        );

        System.out.println(
                "\nReservation created successfully."
        );

        System.out.println(reservation);
    }

    // ================= FIND SPACE =================

    static ParkingSpace findSpace(
            String spaceId) {

        for (ParkingLot lot :
                parkingLots.values()) {

            for (ParkingSpace space :
                    lot.getSpaces()) {

                if (space.getSpaceId()
                        .equals(spaceId)) {

                    return space;
                }
            }
        }

        return null;
    }

    // ================= VIEW RESERVATIONS =================

    static void displayReservations() {

        System.out.println("\n--- RESERVATIONS ---");

        if (reservations.isEmpty()) {

            System.out.println(
                    "No reservations available."
            );
            return;
        }

        for (Reservation reservation :
                reservations.values()) {

            System.out.println(reservation);
        }
    }

    // ================= CHECK IN =================

    static void checkIn() {

        System.out.println("\n--- CHECK IN ---");

        String reservationId =
                readString(
                        "Enter Reservation ID: "
                );

        Reservation reservation =
                reservations.get(reservationId);

        if (reservation == null) {

            System.out.println(
                    "Reservation not found."
            );
            return;
        }

        try {

            reservation.checkIn();

            System.out.println(
                    "Vehicle checked in successfully."
            );

        }
        catch (IllegalStateException e) {

            System.out.println(
                    "Check-in failed: "
                    + e.getMessage()
            );
        }
    }

    // ================= CANCEL =================

    static void cancelReservation() {

        System.out.println(
                "\n--- CANCEL RESERVATION ---"
        );

        String reservationId =
                readString(
                        "Enter Reservation ID: "
                );

        Reservation reservation =
                reservations.get(reservationId);

        if (reservation == null) {

            System.out.println(
                    "Reservation not found."
            );
            return;
        }

        try {

            reservation.cancel();

            System.out.println(
                    "Reservation cancelled successfully."
            );

        }
        catch (IllegalStateException e) {

            System.out.println(
                    "Cancellation failed: "
                    + e.getMessage()
            );
        }
    }

    // ================= CHECK OUT =================

    static void checkOut() {

        System.out.println("\n--- CHECK OUT ---");

        String reservationId =
                readString(
                        "Enter Reservation ID: "
                );

        Reservation reservation =
                reservations.get(reservationId);

        if (reservation == null) {

            System.out.println(
                    "Reservation not found."
            );
            return;
        }

        try {

            reservation.checkOut();

            System.out.println(
                    "Vehicle checked out successfully."
            );

        }
        catch (IllegalStateException e) {

            System.out.println(
                    "Check-out failed: "
                    + e.getMessage()
            );
        }
    }

    // ================= INPUT METHODS =================

    static String readString(String message) {

        System.out.print(message);

        return scanner.nextLine().trim();
    }

    static int readInt(String message) {

        while (true) {

            try {

                System.out.print(message);

                return Integer.parseInt(
                        scanner.nextLine().trim()
                );

            }
            catch (NumberFormatException e) {

                System.out.println(
                        "Please enter a valid number."
                );
            }
        }
    }

    static boolean readYesNo(String message) {

        while (true) {

            System.out.print(message);

            String input =
                    scanner.nextLine()
                           .trim()
                           .toUpperCase();

            if (input.equals("Y")) {
                return true;
            }

            if (input.equals("N")) {
                return false;
            }

            System.out.println(
                    "Please enter Y or N."
            );
        }
    }

    static int readTime(String message) {

        while (true) {

            String input =
                    readString(message);

            try {

                String[] parts =
                        input.split(":");

                if (parts.length != 2) {
                    throw new Exception();
                }

                int hour =
                        Integer.parseInt(parts[0]);

                int minute =
                        Integer.parseInt(parts[1]);

                if (hour < 0 || hour > 23 ||
                    minute < 0 || minute > 59) {

                    throw new Exception();
                }

                return hour * 60 + minute;

            }
            catch (Exception e) {

                System.out.println(
                        "Invalid time. Use HH:MM format."
                );
            }
        }
    }
}