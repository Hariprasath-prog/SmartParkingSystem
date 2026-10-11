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

    // Documented configurable grace period for late arrivals (20 minutes timeout)
    public static final int DEFAULT_GRACE_PERIOD_MINUTES = 20;

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
    public synchronized AllocationResult requestParkingAllocation(String vehicleId, String originNode,
                                                                  int startTime, int endTime, int accessPriority) {
        return performAllocation(vehicleId, originNode, null, -1.0, startTime, endTime, accessPriority, true);
    }

    public synchronized AllocationResult requestParkingAllocation(String vehicleId, String originNode,
                                                                  String preferredLotId, double maxDistanceKm,
                                                                  int startTime, int endTime, int accessPriority) {
        return performAllocation(vehicleId, originNode, preferredLotId, maxDistanceKm, startTime, endTime, accessPriority, true);
    }

    public synchronized AllocationResult performAllocation(String vehicleId, String originNode,
                                                           int startTime, int endTime, int accessPriority,
                                                           boolean enqueueIfUnavailable) {
        return performAllocation(vehicleId, originNode, null, -1.0, startTime, endTime, accessPriority, enqueueIfUnavailable);
    }

    /**
     * Internal allocation engine.
     * Evaluates vehicle compatibility, interval overlap, preferred lot preference,
     * max distance constraint, and Dijkstra shortest path routing.
     *
     * @param enqueueIfUnavailable if true, adds to waitingQueue when no compatible space is available.
     */
    public synchronized AllocationResult performAllocation(String vehicleId, String originNode,
                                                           String preferredLotId, double maxDistanceKm,
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

                // Current physical availability check
                if (!space.isAvailable()) {
                    continue;
                }

                // Check reservation interval conflicts (newStart < existingEnd && newEnd > existingStart)
                if (reservationManager.hasOverlappingReservation(space.getSpaceId(), startTime, endTime)) {
                    continue;
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
                return AllocationResult.failed("No compatible parking space available across all facilities.");
            }
        }

        // Step 5: Run Dijkstra's algorithm to calculate travel time to eligible lots
        Map<String, ShortestPathResult> shortestPaths = DijkstraAlgorithm.computeAllShortestPaths(roadNetwork, origin);

        // Filter by max distance if requested
        if (maxDistanceKm > 0) {
            Map<ParkingLot, List<ParkingSpace>> filteredLots = new HashMap<>();
            for (Map.Entry<ParkingLot, List<ParkingSpace>> entry : eligibleLotSpaces.entrySet()) {
                ShortestPathResult r = shortestPaths.get(entry.getKey().getLocationNode());
                if (r != null && r.isReachable()) {
                    double dist = Math.round(r.getTravelTimeMinutes() * 0.35 * 10.0) / 10.0;
                    if (dist <= maxDistanceKm) {
                        filteredLots.put(entry.getKey(), entry.getValue());
                    }
                }
            }
            if (!filteredLots.isEmpty()) {
                eligibleLotSpaces = filteredLots;
            }
        }

        // Step 6: Select the best lot (Check Preferred Area first, otherwise nearest reachable via Dijkstra)
        ParkingLot bestLot = null;
        int minTravelTime = Integer.MAX_VALUE;
        ShortestPathResult bestRoute = null;
        boolean preferredSelected = false;

        // Check if preferred lot has available compatible spaces
        if (preferredLotId != null && !preferredLotId.trim().isEmpty()) {
            String pId = preferredLotId.trim().toUpperCase();
            for (ParkingLot lot : eligibleLotSpaces.keySet()) {
                if (lot.getLotId().equalsIgnoreCase(pId)) {
                    bestLot = lot;
                    bestRoute = shortestPaths.get(lot.getLocationNode());
                    minTravelTime = (bestRoute != null && bestRoute.isReachable()) ? bestRoute.getTravelTimeMinutes() : 0;
                    preferredSelected = true;
                    break;
                }
            }
        }

        // If no preferred lot requested or preferred lot was full, pick nearest reachable eligible lot
        if (bestLot == null) {
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
        }

        if (bestLot == null) {
            return AllocationResult.failed("None of the eligible parking lots are reachable from node " + origin + ".");
        }

        // Step 7: Within that selected lot, select best compatible space
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
        String message = (preferredLotId != null && !preferredLotId.trim().isEmpty() && !preferredSelected)
                ? "Preferred facility " + preferredLotId + " is unavailable. Allocated nearest alternative: " + bestLot.getLotId()
                : "Reservation successfully confirmed.";

        return new AllocationResult(true, message, reservation, bestLot, selectedSpace, minTravelTime, routeString, null);
    }

    // =========================================================================
    // CHECK-IN WORKFLOW (Section 11)
    // =========================================================================

    public synchronized Reservation checkIn(String reservationId, String vehicleId) {
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

        // Arrival before 20 mins rule:
        // A user can arrive up to 20 mins before their scheduled slot (startTime - 20)
        // or within the 20-minute hold window before expiry.
        int earliestArrival = res.getStartTime() - 20;
        int latestArrival = res.getExpiryDeadline() > 0 ? res.getExpiryDeadline() : (res.getStartTime() + 20);

        if (currentSimulatedTime > 0 && currentSimulatedTime < earliestArrival) {
            throw new IllegalStateException("Early arrival window not yet open. You can check in up to 20 minutes before start time (from " +
                    Reservation.formatTime(earliestArrival) + "). Current network time is " + Reservation.formatTime(currentSimulatedTime) + ".");
        }

        // Transition RESERVED -> CHECKED_IN; space -> OCCUPIED
        res.checkIn();
        return res;
    }

    /**
     * Updates/reassigns the parking space for an active reservation.
     * Frees the old space back to AVAILABLE, and marks the new space as RESERVED or OCCUPIED.
     */
    public synchronized Reservation updateParkingSpace(String reservationId, String newSpaceId) {
        Reservation res = reservationManager.getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " does not exist.");
        }
        if (res.getStatus() != ReservationStatus.RESERVED && res.getStatus() != ReservationStatus.CHECKED_IN) {
            throw new IllegalStateException("Cannot update space for reservation in " + res.getStatus() + " status.");
        }
        if (newSpaceId == null || newSpaceId.trim().isEmpty()) {
            throw new IllegalArgumentException("Target parking space ID cannot be empty.");
        }

        newSpaceId = newSpaceId.trim().toUpperCase();
        if (res.getSpace().getSpaceId().equalsIgnoreCase(newSpaceId)) {
            return res; // Already assigned to this space
        }

        // Find target space across all facilities
        ParkingSpace targetSpace = spaceMap.get(newSpaceId);

        if (targetSpace == null) {
            throw new IllegalArgumentException("Parking space " + newSpaceId + " not found.");
        }

        // Check vehicle compatibility
        if (!targetSpace.acceptsVehicle(res.getVehicle())) {
            throw new IllegalStateException("Space " + newSpaceId + " (" + targetSpace.getSpaceType() +
                    ") is not compatible with vehicle type " + res.getVehicle().getType() + ".");
        }

        // Check accessibility permit requirement
        if (targetSpace instanceof model.AccessibleSpace && !res.getVehicle().hasAccessiblePermit()) {
            throw new IllegalStateException("Space " + newSpaceId + " is an Accessible Stall reserved for vehicles with mobility permits.");
        }

        // Check if target space is available
        if (!targetSpace.isAvailable()) {
            throw new IllegalStateException("Parking space " + newSpaceId + " is currently " + targetSpace.getStatus() + " and not available.");
        }

        // Check for interval conflicts on target space
        if (reservationManager.hasOverlappingReservation(targetSpace.getSpaceId(), res.getStartTime(), res.getEndTime())) {
            throw new IllegalStateException("Parking space " + newSpaceId + " has a scheduling conflict during " +
                    Reservation.formatTime(res.getStartTime()) + " - " + Reservation.formatTime(res.getEndTime()) + ".");
        }

        // Free previous space
        ParkingSpace oldSpace = res.getSpace();
        oldSpace.reset();

        // Assign and transition new space to match current reservation state
        if (res.getStatus() == ReservationStatus.CHECKED_IN) {
            targetSpace.reserve();
            targetSpace.checkIn(); // Becomes OCCUPIED
        } else {
            targetSpace.reserve(); // Becomes RESERVED
        }

        res.setSpace(targetSpace);
        return res;
    }

    // =========================================================================
    // CHECK-OUT WORKFLOW (Section 12)
    // =========================================================================

    public synchronized Reservation checkOut(String reservationId) {
        Reservation res = reservationManager.getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " does not exist.");
        }

        // Transition CHECKED_IN or OVERSTAY -> COMPLETED; space -> AVAILABLE
        res.checkOut();

        // Immediately trigger waiting-list reconsideration
        reconsiderWaitingList();
        return res;
    }

    // =========================================================================
    // CANCELLATION WORKFLOW (Section 13)
    // =========================================================================

    public synchronized Reservation cancelReservation(String reservationId) {
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

    public synchronized List<Reservation> processExpiredReservations(int gracePeriodMinutes) {
        List<Reservation> expired = reservationManager.processExpiredReservations(
                currentSimulatedTime, gracePeriodMinutes);

        if (!expired.isEmpty()) {
            reconsiderWaitingList();
        }
        return expired;
    }

    // =========================================================================
    // OVERSTAY WORKFLOW (TEST 4)
    // =========================================================================

    public synchronized List<Reservation> checkOverstays() {
        return reservationManager.checkOverstays(currentSimulatedTime);
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

    // ==========================================
    // NEARBY PARKING SUGGESTIONS (DIJKSTRA)
    // ==========================================

    public static class NearbyLotSuggestion {
        private final String lotId;
        private final String lotName;
        private final String locationNode;
        private final int travelTimeMinutes;
        private final double distanceKm;
        private final String travelRoute;
        private final int availableSpaces;
        private final String sampleSpaceId;

        public NearbyLotSuggestion(String lotId, String lotName, String locationNode,
                                   int travelTimeMinutes, double distanceKm, String travelRoute,
                                   int availableSpaces, String sampleSpaceId) {
            this.lotId = lotId;
            this.lotName = lotName;
            this.locationNode = locationNode;
            this.travelTimeMinutes = travelTimeMinutes;
            this.distanceKm = distanceKm;
            this.travelRoute = travelRoute;
            this.availableSpaces = availableSpaces;
            this.sampleSpaceId = sampleSpaceId;
        }

        public String getLotId() { return lotId; }
        public String getLotName() { return lotName; }
        public String getLocationNode() { return locationNode; }
        public int getTravelTimeMinutes() { return travelTimeMinutes; }
        public double getDistanceKm() { return distanceKm; }
        public String getTravelRoute() { return travelRoute; }
        public int getAvailableSpaces() { return availableSpaces; }
        public String getSampleSpaceId() { return sampleSpaceId; }
    }

    /**
     * Evaluates all parking lots from an origin node using Dijkstra shortest paths
     * and returns available capacity, timing, and travel route recommendations.
     */
    public List<NearbyLotSuggestion> getNearbyLotSuggestions(String originNode, Vehicle vehicle, int startTime, int endTime) {
        String origin = (originNode != null && roadNetwork.hasNode(originNode.trim().toUpperCase()))
                ? originNode.trim().toUpperCase() : "N1";

        Map<String, DijkstraAlgorithm.ShortestPathResult> shortestPaths =
                DijkstraAlgorithm.computeAllShortestPaths(roadNetwork, origin);

        List<NearbyLotSuggestion> suggestions = new ArrayList<>();

        for (ParkingLot lot : lotMap.values()) {
            DijkstraAlgorithm.ShortestPathResult routeResult = shortestPaths.get(lot.getLocationNode());
            int travelTime = (routeResult != null && routeResult.isReachable()) ? routeResult.getTravelTimeMinutes() : 999;
            String routeStr = (routeResult != null && routeResult.isReachable()) ? routeResult.getPathString() : "[No route]";
            double distKm = Math.round(travelTime * 0.35 * 10.0) / 10.0; // Approx 0.35 km per minute in urban grid

            int availCount = 0;
            String sampleSpace = null;
            for (ParkingSpace space : lot.getSpaces()) {
                if (vehicle != null && !slotPolicy.isCompatible(space, vehicle)) {
                    continue;
                }
                if (!space.isAvailable()) {
                    continue;
                }
                if (reservationManager.hasOverlappingReservation(space.getSpaceId(), startTime, endTime)) {
                    continue;
                }
                availCount++;
                if (sampleSpace == null) {
                    sampleSpace = space.getSpaceId();
                }
            }

            suggestions.add(new NearbyLotSuggestion(
                    lot.getLotId(), lot.getLotName(), lot.getLocationNode(),
                    travelTime, distKm, routeStr, availCount, sampleSpace
            ));
        }

        // Sort by shortest travel time (Dijkstra)
        suggestions.sort((a, b) -> Integer.compare(a.getTravelTimeMinutes(), b.getTravelTimeMinutes()));
        return suggestions;
    }

    public List<ParkingRequest> getWaitingRequests() {
        List<ParkingRequest> list = new ArrayList<>(waitingQueue);
        Collections.sort(list); // Display in queue order
        return list;
    }
}
