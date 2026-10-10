package com.idamnagar.parking.dto;

/**
 * DTO representing a booking/reservation response sent to the frontend.
 * Flattens the Reservation, ParkingSpace, ParkingLot, and Vehicle Java objects
 * into a flat JSON-serializable structure.
 */
public class BookingResponseDTO {

    private boolean success;
    private boolean queued;
    private String message;

    // Reservation fields (null if not yet allocated or queued)
    private String reservationId;
    private String vehicleId;
    private String ownerName;
    private String vehicleType;
    private String spaceId;
    private String spaceType;
    private String lotId;
    private String lotName;
    private int startTime;
    private int endTime;
    private String startTimeFormatted;
    private String endTimeFormatted;
    private String status;

    // Route information from Dijkstra's algorithm
    private int travelTimeMinutes;
    private String travelRoute;

    // Waiting queue (if queued rather than immediately allocated)
    private String requestId;
    private int queuePriority;

    // ---- Getters / Setters ----

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public boolean isQueued() { return queued; }
    public void setQueued(boolean queued) { this.queued = queued; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getReservationId() { return reservationId; }
    public void setReservationId(String reservationId) { this.reservationId = reservationId; }

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getSpaceId() { return spaceId; }
    public void setSpaceId(String spaceId) { this.spaceId = spaceId; }

    public String getSpaceType() { return spaceType; }
    public void setSpaceType(String spaceType) { this.spaceType = spaceType; }

    public String getLotId() { return lotId; }
    public void setLotId(String lotId) { this.lotId = lotId; }

    public String getLotName() { return lotName; }
    public void setLotName(String lotName) { this.lotName = lotName; }

    public int getStartTime() { return startTime; }
    public void setStartTime(int startTime) { this.startTime = startTime; }

    public int getEndTime() { return endTime; }
    public void setEndTime(int endTime) { this.endTime = endTime; }

    public String getStartTimeFormatted() { return startTimeFormatted; }
    public void setStartTimeFormatted(String startTimeFormatted) { this.startTimeFormatted = startTimeFormatted; }

    public String getEndTimeFormatted() { return endTimeFormatted; }
    public void setEndTimeFormatted(String endTimeFormatted) { this.endTimeFormatted = endTimeFormatted; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getTravelTimeMinutes() { return travelTimeMinutes; }
    public void setTravelTimeMinutes(int travelTimeMinutes) { this.travelTimeMinutes = travelTimeMinutes; }

    public String getTravelRoute() { return travelRoute; }
    public void setTravelRoute(String travelRoute) { this.travelRoute = travelRoute; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public int getQueuePriority() { return queuePriority; }
    public void setQueuePriority(int queuePriority) { this.queuePriority = queuePriority; }
}
