package model;

/**
 * Represents a driver's request for parking/reservation in Idam Nagar.
 * Implements Comparable for deterministic ranking in the waiting PriorityQueue:
 * 1. Declared access priority (lower number = higher priority)
 * 2. Arrival / request time (earlier time = higher priority)
 * 3. Request ID tie-breaker
 */
public class ParkingRequest implements Comparable<ParkingRequest> {
    private String requestId;
    private Vehicle vehicle;
    private int requestTime;          // Simulated time of submission (minutes)
    private int accessPriority;       // 1 = High / Accessible / Emergency, 2 = Standard
    private int requestedStartTime;   // Desired start time (minutes)
    private int requestedEndTime;     // Desired end time (minutes)
    private String originNode;        // Driver's road network node (e.g. "N1")
    private String status;            // PENDING, WAITING, ALLOCATED, CANCELLED

    public ParkingRequest(String requestId, Vehicle vehicle, int requestTime,
                          int accessPriority, int requestedStartTime, int requestedEndTime,
                          String originNode) {
        if (requestId == null || requestId.trim().isEmpty()) {
            throw new IllegalArgumentException("Request ID cannot be empty.");
        }
        if (vehicle == null) {
            throw new IllegalArgumentException("Vehicle cannot be null.");
        }
        if (requestedStartTime >= requestedEndTime) {
            throw new IllegalArgumentException("Requested end time must be greater than start time.");
        }
        this.requestId = requestId.trim();
        this.vehicle = vehicle;
        this.requestTime = requestTime;
        this.accessPriority = accessPriority;
        this.requestedStartTime = requestedStartTime;
        this.requestedEndTime = requestedEndTime;
        this.originNode = (originNode != null) ? originNode.trim() : "N1";
        this.status = "PENDING";
    }

    public String getRequestId() {
        return requestId;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public int getRequestTime() {
        return requestTime;
    }

    public int getAccessPriority() {
        return accessPriority;
    }

    public void setAccessPriority(int accessPriority) {
        this.accessPriority = accessPriority;
    }

    public int getRequestedStartTime() {
        return requestedStartTime;
    }

    public int getRequestedEndTime() {
        return requestedEndTime;
    }

    public String getOriginNode() {
        return originNode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public int compareTo(ParkingRequest other) {
        // Criterion 1: Access Priority (lower numeric value = higher priority)
        int pCompare = Integer.compare(this.accessPriority, other.accessPriority);
        if (pCompare != 0) {
            return pCompare;
        }

        // Criterion 2: Arrival/Request Time (earlier request = higher priority)
        int tCompare = Integer.compare(this.requestTime, other.requestTime);
        if (tCompare != 0) {
            return tCompare;
        }

        // Criterion 3: Deterministic tie-breaker
        return this.requestId.compareTo(other.requestId);
    }

    @Override
    public String toString() {
        String priorityLabel = (accessPriority == 1) ? "HIGH (Permit/Priority)" : "STANDARD";
        return String.format("[%s] Veh: %-10s Pri: %-22s Arr: %s | Slot: %s-%s Origin: %s | Status: %s",
                requestId, vehicle.getVehicleId(), priorityLabel,
                Reservation.formatTime(requestTime),
                Reservation.formatTime(requestedStartTime),
                Reservation.formatTime(requestedEndTime),
                originNode, status);
    }
}
