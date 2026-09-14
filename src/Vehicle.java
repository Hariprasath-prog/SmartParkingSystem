package model;

public class Vehicle {

    private String vehicleId;
    private String ownerName;
    private VehicleType type;
    private boolean accessiblePermit;

    public Vehicle(String vehicleId, String ownerName,
                   VehicleType type, boolean accessiblePermit) {

        this.vehicleId = vehicleId;
        this.ownerName = ownerName;
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

        return "Vehicle ID: " + vehicleId +
                ", Owner: " + ownerName +
                ", Type: " + type +
                ", Accessible Permit: " +
                (accessiblePermit ? "YES" : "NO");
    }
}