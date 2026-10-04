package model;

/**
 * Represents a standard car parking space.
 * Accepts only CAR vehicle types.
 */
public class CarSpace extends ParkingSpace {

    public CarSpace(String spaceId, String lotId) {
        super(spaceId, lotId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {
        return vehicle != null && vehicle.getType() == VehicleType.CAR;
    }

    @Override
    public String getSpaceType() {
        return "CAR";
    }
}
