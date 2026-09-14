package model;

public class CarSpace extends ParkingSpace {

    public CarSpace(String spaceId) {
        super(spaceId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {

        return vehicle.getType() == VehicleType.CAR
                && !vehicle.hasAccessiblePermit();
    }

    @Override
    public String getSpaceType() {
        return "CAR";
    }
}