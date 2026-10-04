package model;

/**
 * Represents a parking space dedicated to two-wheelers (motorcycles, scooters).
 * Accepts only TWO_WHEELER vehicle types.
 */
public class TwoWheelerSpace extends ParkingSpace {

    public TwoWheelerSpace(String spaceId, String lotId) {
        super(spaceId, lotId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {
        return vehicle != null && vehicle.getType() == VehicleType.TWO_WHEELER;
    }

    @Override
    public String getSpaceType() {
        return "TWO_WHEELER";
    }
}
