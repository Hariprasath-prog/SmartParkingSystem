package service;

import graph.DijkstraAlgorithm;
import graph.DijkstraAlgorithm.ShortestPathResult;
import graph.WeightedGraph;
import model.ParkingLot;
import model.ParkingRequest;
import model.ParkingSpace;
import model.Reservation;
import model.ReservationStatus;
import model.Vehicle;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

/**
 * Central orchestrator and business-logic controller for the Smart Parking Allocation System.
 * Coordinates lots, spaces, vehicles, reservations, road graph routing, and waiting-queue reconsideration.
 */
public class ParkingOperationsController {

    // Documented configurable grace period for late arrivals
    public static final int DEFAULT_GRACE_PERIOD_MINUTES = 15;

    // Fast O(1) lookup tables (Section 8: HashMap)
    private final Map<String, ParkingLot> lotMap;
    private final Map<String, ParkingSpace> spaceMap;
    private final Map<String, Vehicle> vehicleMap;

    // Ordered waiting queue (Section 8: PriorityQueue)
    private final PriorityQueue<ParkingRequest> waitingQueue;
    private final List<ParkingRequest> requestHistory;

    // In-memory graph of Idam Nagar road network (Section 8: WeightedGraph)
    private final WeightedGraph roadNetwork;

    // Reservation subsystem
    private final ReservationManager reservationManager;

    // Extensible slot selection abstraction (Section 16)
    private SlotSelectionPolicy slotPolicy;

    // Simulated system clock (in minutes from midnight, e.g. 540 = 09:00 AM)
    private int currentSimulatedTime;

    private int requestCounter = 100;

    public ParkingOperationsController(WeightedGraph graph) {
        this.lotMap = new HashMap<>();
        this.spaceMap = new HashMap<>();
        this.vehicleMap = new HashMap<>();
        this.waitingQueue = new PriorityQueue<>();
        this.requestHistory = new ArrayList<>();
        this.roadNetwork = (graph != null) ? graph : new WeightedGraph();
        this.reservationManager = new ReservationManager();
        this.slotPolicy = new DefaultSlotSelectionPolicy();
        this.currentSimulatedTime = 480; // Default simulated clock: 08:00 AM
    }

    // ==========================================
    // INVENTORY AND REGISTRATION MANAGEMENT
    // ==========================================

    public void addParkingLot(ParkingLot lot) {
        if (lot == null) return;
        lotMap.put(lot.getLotId().toUpperCase(), lot);
    }

    public void addParkingSpace(ParkingSpace space, String lotId) {
        if (space == null || lotId == null) return;
        ParkingLot lot = lotMap.get(lotId.toUpperCase());
        if (lot == null) {
            throw new IllegalArgumentException("Lot " + lotId + " does not exist.");
        }
        lot.addSpace(space);
        spaceMap.put(space.getSpaceId().toUpperCase(), space);
    }

    public void registerVehicle(Vehicle vehicle) {
        if (vehicle == null) return;
        vehicleMap.put(vehicle.getVehicleId().toUpperCase(), vehicle);
    }

    public Vehicle getVehicle(String vehicleId) {
        if (vehicleId == null) return null;
        return vehicleMap.get(vehicleId.trim().toUpperCase());
    }

    public ParkingLot getLot(String lotId) {
        if (lotId == null) return null;
        return lotMap.get(lotId.trim().toUpperCase());
    }

    public ParkingSpace getSpace(String spaceId) {
        if (spaceId == null) return null;
        return spaceMap.get(spaceId.trim().toUpperCase());
    }

    public WeightedGraph getRoadNetwork() {
        return roadNetwork;
    }

    public ReservationManager getReservationManager() {
        return reservationManager;
    }

    public void setSlotPolicy(SlotSelectionPolicy policy) {
        if (policy != null) {
            this.slotPolicy = policy;
        }
    }

    // ==========================================
    // SIMULATED TIME MANAGEMENT
    // ==========================================

    public int getCurrentSimulatedTime() {
        return currentSimulatedTime;
    }

    public void setSimulatedTime(int timeInMinutes) {
        this.currentSimulatedTime = timeInMinutes;
    }

    public void advanceSimulatedTime(int additionalMinutes) {
        if (additionalMinutes < 0) {
            throw new IllegalArgumentException("Cannot rewind simulated time.");
        }
        this.currentSimulatedTime += additionalMinutes;
    }

    // ==========================================
    // RESULT WRAPPERS
    // ==========================================

    public static class AllocationResult {
        private final boolean success;
        private final String message;
        private final Reservation reservation;
        private final ParkingLot selectedLot;
        private final ParkingSpace selectedSpace;
        private final int travelTimeMinutes;
        private final String travelRoute;
        private final ParkingRequest queuedRequest;

        private AllocationResult(boolean success, String message, Reservation reservation,
                                 ParkingLot selectedLot, ParkingSpace selectedSpace,
                                 int travelTimeMinutes, String travelRoute,
                                 ParkingRequest queuedRequest) {
            this.success = success;
            this.message = message;
            this.reservation = reservation;
            this.selectedLot = selectedLot;
            this.selectedSpace = selectedSpace;
            this.travelTimeMinutes = travelTimeMinutes;
            this.travelRoute = travelRoute;
            this.queuedRequest = queuedRequest;
        }

        public static AllocationResult successful(Reservation reservation, ParkingLot lot,
                                                  ParkingSpace space, int travelTime, String route) {
            return new AllocationResult(true, "Reservation successfully confirmed.",
                    reservation, lot, space, travelTime, route, null);
        }

        public static AllocationResult queued(ParkingRequest request, String reason) {
            return new AllocationResult(false, reason, null, null, null, -1, null, request);
        }

        public static AllocationResult failed(String reason) {
            return new AllocationResult(false, reason, null, null, null, -1, null, null);
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }

        public Reservation getReservation() {
            return reservation;
        }

        public ParkingLot getSelectedLot() {
            return selectedLot;
        }

        public ParkingSpace getSelectedSpace() {
            return selectedSpace;
        }

        public int getTravelTimeMinutes() {
            return travelTimeMinutes;
        }

        public String getTravelRoute() {
            return travelRoute;
        }

        public ParkingRequest getQueuedRequest() {
            return queuedRequest;
        }
    }

    // =========================================================================
    // CORE PARKING ALLOCATION RULE (Section 9 & Section 30 - Strict Order)
    // =========================================================================

    /**
     * Executes the mandatory multi-step allocation algorithm:
     * 1. Read request parameters
     * 2. Filter compatible spaces (Vehicle type, accessibility, space type)
     * 3. Filter out spaces with interval conflicts (newStart < existingEnd && newEnd > existingStart)
     * 4. Determine eligible parking lots
     * 5. Run Dijkstra from driver's origin node to candidate lots
     * 6. Select nearest reachable eligible lot (minimum travel time)
     * 7. Select compatible space inside that lot
     * 8. Reserve space immediately
     * 9. Return and confirm details
     *
     * If no compatible space is available across all lots, adds to PriorityQueue waiting list.
     */
    public AllocationResult requestParkingAllocation(String vehicleId, String originNode,
                                                     int startTime, int endTime, int accessPriority) {
        return performAllocation(vehicleId, originNode, startTime, endTime, accessPriority, true);
    }

    /**
     * Internal allocation engine.
     * @param enqueueIfUnavailable if true, adds to waitingQueue when no compatible space is available.
     */
    public AllocationResult performAllocation(String vehicleId, String originNode,
                                              int startTime, int endTime, int accessPriority,
                                              boolean enqueueIfUnavailable) {
        // Step 1: Validate and read input
        Vehicle vehicle = getVehicle(vehicleId);
        if (vehicle == null) {
            return AllocationResult.failed("Vehicle [" + vehicleId + "] is not registered in system.");
        }

        if (startTime >= endTime) {
            return AllocationResult.failed("Invalid interval: End time (" + Reservation.formatTime(endTime) +
                    ") must be after start time (" + Reservation.formatTime(startTime) + ").");
        }

        String origin = (originNode != null && roadNetwork.hasNode(originNode.trim().toUpperCase()))
                ? originNode.trim().toUpperCase() : "N1";

        // Step 2 & 3: Find eligible spaces per lot
        Map<ParkingLot, List<ParkingSpace>> eligibleLotSpaces = new HashMap<>();

        for (ParkingLot lot : lotMap.values()) {
            List<ParkingSpace> compatibleAndFreeSpaces = new ArrayList<>();
            for (ParkingSpace space : lot.getSpaces()) {
                // Compatibility check via polymorphic SlotSelectionPolicy
                if (!slotPolicy.isCompatible(space, vehicle)) {
                    continue;
                }

                // Current physical occupancy check if request starts immediately or is active now
                if (startTime <= currentSimulatedTime && space.isOccupied()) {
                    continue;
                }

                // Check reservation interval conflicts (newStart < existingEnd && newEnd > existingStart)
                if (reservationManager.hasOverlappingReservation(space.getSpaceId(), startTime, endTime)) {
                    continue;
                }

                // If currently reserved by another booking that is not completed
                if (!space.isAvailable()) {
                    // Check if existing reservation status truly conflicts
                    if (reservationManager.hasOverlappingReservation(space.getSpaceId(), startTime, endTime)) {
                        continue;
                    }
                }

                compatibleAndFreeSpaces.add(space);
            }

            if (!compatibleAndFreeSpaces.isEmpty()) {
                eligibleLotSpaces.put(lot, compatibleAndFreeSpaces);
            }
        }

        // Step 4: If no lots have eligible spaces, queue in PriorityQueue (Section 10)
        if (eligibleLotSpaces.isEmpty()) {
            if (enqueueIfUnavailable) {
                String reqId = "REQ-" + (++requestCounter);
                ParkingRequest request = new ParkingRequest(reqId, vehicle, currentSimulatedTime,
                        accessPriority, startTime, endTime, origin);
                request.setStatus("WAITING");
                waitingQueue.add(request);
                requestHistory.add(request);

                return AllocationResult.queued(request,
                        "No compatible parking space available. Added to waiting list (Ranked in PriorityQueue).");
            } else {
                return AllocationResult.failed("No compatible parking space available.");
            }
        }

        // Step 5: Run Dijkstra's algorithm to calculate travel time to eligible lots
        Map<String, ShortestPathResult> shortestPaths = DijkstraAlgorithm.computeAllShortestPaths(roadNetwork, origin);

        // Step 6: Select the nearest reachable eligible lot
        ParkingLot bestLot = null;
        int minTravelTime = Integer.MAX_VALUE;
        ShortestPathResult bestRoute = null;

        for (ParkingLot lot : eligibleLotSpaces.keySet()) {
            String lotNode = lot.getLocationNode();
            ShortestPathResult routeResult = shortestPaths.get(lotNode);

            if (routeResult != null && routeResult.isReachable()) {
                if (routeResult.getTravelTimeMinutes() < minTravelTime) {
                    minTravelTime = routeResult.getTravelTimeMinutes();
                    bestLot = lot;
                    bestRoute = routeResult;
                }
            }
        }

        if (bestLot == null) {
            return AllocationResult.failed("None of the eligible parking lots are reachable from node " + origin + ".");
        }

        // Step 7: Within that nearest lot, select best compatible space
        List<ParkingSpace> candidateSpaces = eligibleLotSpaces.get(bestLot);
        ParkingSpace selectedSpace = slotPolicy.selectBestSpace(candidateSpaces, vehicle);
        if (selectedSpace == null) {
            return AllocationResult.failed("Slot selection policy could not pick a space in " + bestLot.getLotId());
        }

        // Step 8: Reserve space immediately
        Reservation reservation = reservationManager.createReservation(vehicle, selectedSpace,
                startTime, endTime, currentSimulatedTime);

        // Step 9: Return confirmation
        String routeString = (bestRoute != null) ? bestRoute.getPathString() : "[Direct]";
        return AllocationResult.successful(reservation, bestLot, selectedSpace, minTravelTime, routeString);
    }

    // =========================================================================
    // CHECK-IN WORKFLOW (Section 11)
    // =========================================================================

    public Reservation checkIn(String reservationId, String vehicleId) {
        Reservation res = reservationManager.getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " does not exist.");
        }

        if (vehicleId != null && !res.getVehicle().getVehicleId().equalsIgnoreCase(vehicleId.trim())) {
            throw new IllegalArgumentException("Vehicle ID [" + vehicleId +
                    "] does not match reservation [" + res.getVehicle().getVehicleId() + "].");
        }

        if (res.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalStateException("Cannot check-in: Reservation has been CANCELLED.");
        }

        if (res.getStatus() == ReservationStatus.EXPIRED) {
            throw new IllegalStateException("Cannot check-in: Reservation has EXPIRED.");
        }

        if (res.getStatus() == ReservationStatus.COMPLETED) {
            throw new IllegalStateException("Cannot check-in: Reservation has already been COMPLETED.");
        }

        if (res.getStatus() == ReservationStatus.CHECKED_IN) {
            throw new IllegalStateException("Vehicle is already checked-in.");
        }

        // Transition RESERVED -> CHECKED_IN; space -> OCCUPIED
        res.checkIn();
        return res;
    }

    // =========================================================================
    // CHECK-OUT WORKFLOW (Section 12)
    // =========================================================================

    public Reservation checkOut(String reservationId) {
        Reservation res = reservationManager.getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " does not exist.");
        }

        // Transition CHECKED_IN -> COMPLETED; space -> AVAILABLE
        res.checkOut();

        // Immediately trigger waiting-list reconsideration
        reconsiderWaitingList();
        return res;
    }

    // =========================================================================
    // CANCELLATION WORKFLOW (Section 13)
    // =========================================================================

    public Reservation cancelReservation(String reservationId) {
        Reservation res = reservationManager.getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " does not exist.");
        }

        // Transition RESERVED -> CANCELLED; space -> AVAILABLE
        res.cancel();

        // Cancelled reservation never blocks the space; reconsider waiting list
        reconsiderWaitingList();
        return res;
    }

    // =========================================================================
    // EXPIRED RESERVATIONS WORKFLOW (Section 14)
    // =========================================================================

    public List<Reservation> processExpiredReservations(int gracePeriodMinutes) {
        List<Reservation> expired = reservationManager.processExpiredReservations(
                currentSimulatedTime, gracePeriodMinutes);

        if (!expired.isEmpty()) {
            reconsiderWaitingList();
        }
        return expired;
    }

    // =========================================================================
    // WAITING LIST RECONSIDERATION (Section 7, 12, 13, 14)
    // =========================================================================

    /**
     * Inspects the waiting PriorityQueue in ranked order.
     * Tries to allocate newly freed space to eligible waiting requests.
     */
    public List<AllocationResult> reconsiderWaitingList() {
        List<AllocationResult> reconsideredAllocations = new ArrayList<>();
        if (waitingQueue.isEmpty()) {
            return reconsideredAllocations;
        }

        List<ParkingRequest> unfulfilled = new ArrayList<>();

        while (!waitingQueue.isEmpty()) {
            ParkingRequest request = waitingQueue.poll();

            // Attempt allocation for this waiting driver without re-queuing
            AllocationResult result = performAllocation(
                    request.getVehicle().getVehicleId(),
                    request.getOriginNode(),
                    request.getRequestedStartTime(),
                    request.getRequestedEndTime(),
                    request.getAccessPriority(),
                    false // do not re-insert into waiting queue inside performAllocation
            );

            if (result.isSuccess()) {
                request.setStatus("ALLOCATED");
                reconsideredAllocations.add(result);
            } else {
                // Could not allocate in this round; keep in unfulfilled list
                unfulfilled.add(request);
            }
        }

        // Re-insert unfulfilled requests back into PriorityQueue
        waitingQueue.addAll(unfulfilled);

        return reconsideredAllocations;
    }

    /**
     * Updates an existing request's priority and maintains deterministic heap property.
     */
    public void updateRequestPriority(String requestId, int newPriority) {
        ParkingRequest target = null;
        for (ParkingRequest req : waitingQueue) {
            if (req.getRequestId().equalsIgnoreCase(requestId)) {
                target = req;
                break;
            }
        }
        if (target != null) {
            // PriorityQueue does not automatically reorder mutated elements:
            // Remove, modify, and re-insert as required by Section 7
            waitingQueue.remove(target);
            target.setAccessPriority(newPriority);
            waitingQueue.add(target);
        }
    }

    // ==========================================
    // REPORTING AND QUERIES
    // ==========================================

    public List<ParkingLot> getAllLots() {
        return new ArrayList<>(lotMap.values());
    }

    public List<ParkingSpace> getAllSpaces() {
        return new ArrayList<>(spaceMap.values());
    }

    public List<Vehicle> getAllVehicles() {
        return new ArrayList<>(vehicleMap.values());
    }

    public List<Reservation> getAllReservations() {
        return reservationManager.getAllReservations();
    }

    public List<ParkingRequest> getWaitingRequests() {
        List<ParkingRequest> list = new ArrayList<>(waitingQueue);
        Collections.sort(list); // Display in queue order
        return list;
    }
}
