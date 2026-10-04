package model;

/**
 * Represents an accessible parking space designed for persons with disabilities.
 * Strictly requires the vehicle to possess an authorized accessibility permit.
 */
public class AccessibleSpace extends ParkingSpace {

    public AccessibleSpace(String spaceId, String lotId) {
        super(spaceId, lotId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {
        return vehicle != null && vehicle.hasAccessiblePermit();
    }

    @Override
    public String getSpaceType() {
        return "ACCESSIBLE";
    }
}
