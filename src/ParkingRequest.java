package model;

public class ParkingRequest {

    private String requestId;
    private Vehicle vehicle;
    private int requestTime;
    private int priority;

    public ParkingRequest(String requestId,
                          Vehicle vehicle,
                          int requestTime,
                          int priority) {

        this.requestId = requestId;
        this.vehicle = vehicle;
        this.requestTime = requestTime;
        this.priority = priority;
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

    public int getPriority() {
        return priority;
    }

    @Override
    public String toString() {

        return "Request ID: " + requestId +
                ", Vehicle: " + vehicle.getVehicleId() +
                ", Request Time: " + requestTime +
                ", Priority: " + priority;
    }
}