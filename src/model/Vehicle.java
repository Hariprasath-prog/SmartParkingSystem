package model;

public class Vehicle {
    private String vehicleId;
    private String ownerName;
    private VehicleType type;
    private boolean accessiblePermit;

    public Vehicle(String vehicleId, String ownerName, VehicleType type, boolean accessiblePermit) {
        if (vehicleId == null || vehicleId.trim().isEmpty()) {
            throw new IllegalArgumentException("Vehicle ID cannot be empty.");
        }
        this.vehicleId = vehicleId.trim();
        this.ownerName = (ownerName != null) ? ownerName.trim() : "Unknown";
        this.type = type;
        this.accessiblePermit = accessiblePermit;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public VehicleType getType() {
        return type;
    }

    public boolean hasAccessiblePermit() {
        return accessiblePermit;
    }

    @Override
    public String toString() {
        return String.format("[%s] Owner: %-12s Type: %-11s Accessible Permit: %s",
                vehicleId, ownerName, type, (accessiblePermit ? "YES" : "NO"));
    }
}
