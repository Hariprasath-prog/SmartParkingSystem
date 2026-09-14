package model;

public class AccessibleSpace extends ParkingSpace {

    public AccessibleSpace(String spaceId) {
        super(spaceId);
    }

    @Override
    public boolean acceptsVehicle(Vehicle vehicle) {

        return vehicle.hasAccessiblePermit();
    }

    @Override
    public String getSpaceType() {
        return "ACCESSIBLE";
    }
}