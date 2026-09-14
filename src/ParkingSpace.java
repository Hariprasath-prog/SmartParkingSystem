package model;

public abstract class ParkingSpace {

    private String spaceId;
    private boolean occupied;

    public ParkingSpace(String spaceId) {
        this.spaceId = spaceId;
        this.occupied = false;
    }

    public String getSpaceId() {
        return spaceId;
    }

    public boolean isOccupied() {
        return occupied;
    }

    public void occupy() {

        if (occupied) {
            throw new IllegalStateException(
                    "Parking space " + spaceId +
                    " is already occupied."
            );
        }

        occupied = true;
    }

    public void release() {

        if (!occupied) {
            throw new IllegalStateException(
                    "Parking space " + spaceId +
                    " is already free."
            );
        }

        occupied = false;
    }

    public abstract boolean acceptsVehicle(Vehicle vehicle);

    public abstract String getSpaceType();

    @Override
    public String toString() {

        return "Space ID: " + spaceId +
                ", Type: " + getSpaceType() +
                ", Status: " +
                (occupied ? "OCCUPIED" : "AVAILABLE");
    }
}