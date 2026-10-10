package com.idamnagar.parking.dto;

/**
 * DTO for incoming booking/allocation requests from the frontend.
 * Maps to the fields required by ParkingOperationsController.requestParkingAllocation().
 *
 * Time fields use "minutes from midnight" (e.g. 540 = 09:00).
 * The frontend converts HH:MM datetime-local input to minutes before sending.
 */
public class BookingRequestDTO {

    /** Vehicle registration number (must match a registered vehicle ID) */
    private String vehicleId;

    /** Owner name (used when auto-registering a new vehicle) */
    private String ownerName;

    /** Vehicle type: CAR or TWO_WHEELER */
    private String vehicleType;

    /** Does the driver hold an accessibility/disabled permit? */
    private boolean accessiblePermit;

    /** Road network node the driver is starting from (e.g. "N1") */
    private String originNode;

    /** Desired parking start time in minutes from midnight */
    private int startTime;

    /** Desired parking end time in minutes from midnight */
    private int endTime;

    /**
     * Access priority: 1 = High (Accessible/Emergency), 2 = Standard.
     * Determines position in PriorityQueue waiting list.
     */
    private int accessPriority;

    // ---- Getters / Setters ----

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public boolean isAccessiblePermit() { return accessiblePermit; }
    public void setAccessiblePermit(boolean accessiblePermit) { this.accessiblePermit = accessiblePermit; }

    public String getOriginNode() { return originNode; }
    public void setOriginNode(String originNode) { this.originNode = originNode; }

    public int getStartTime() { return startTime; }
    public void setStartTime(int startTime) { this.startTime = startTime; }

    public int getEndTime() { return endTime; }
    public void setEndTime(int endTime) { this.endTime = endTime; }

    public int getAccessPriority() { return accessPriority; }
    public void setAccessPriority(int accessPriority) { this.accessPriority = accessPriority; }
}
