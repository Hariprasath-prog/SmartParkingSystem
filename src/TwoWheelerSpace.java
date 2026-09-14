package model;

public class TwoWheelerSpace extends ParkingSpace {

    public TwoWheelerSpace(String spaceId) {
        super(spaceId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {

        return vehicle.getType() == VehicleType.TWO_WHEELER;
    }

    @Override
    public String getSpaceType() {
        return "TWO-WHEELER";
    }
}