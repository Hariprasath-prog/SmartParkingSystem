package model;

/**
 * Abstract base class representing a parking space in Idam Nagar.
 * Implements state encapsulation and polymorphic vehicle compatibility.
 */
public abstract class ParkingSpace {
    private String spaceId;
    private String lotId;
    private SpaceStatus status;

    public ParkingSpace(String spaceId, String lotId) {
        if (spaceId == null || spaceId.trim().isEmpty()) {
            throw new IllegalArgumentException("Space ID cannot be empty.");
        }
        this.spaceId = spaceId.trim();
        this.lotId = (lotId != null) ? lotId.trim() : "";
        this.status = SpaceStatus.AVAILABLE;
    }

    public String getSpaceId() {
        return spaceId;
    }

    public String getLotId() {
        return lotId;
    }

    public void setLotId(String lotId) {
        this.lotId = lotId;
    }

    public SpaceStatus getStatus() {
        return status;
    }

    public boolean isAvailable() {
        return status == SpaceStatus.AVAILABLE;
    }

    public boolean isReserved() {
        return status == SpaceStatus.RESERVED;
    }

    public boolean isOccupied() {
        return status == SpaceStatus.OCCUPIED;
    }

    /**
     * Transition: AVAILABLE -> RESERVED
     */
    public void reserve() {
        if (status != SpaceStatus.AVAILABLE) {
            throw new IllegalStateException("Cannot reserve space " + spaceId + ": current status is " + status);
        }
        this.status = SpaceStatus.RESERVED;
    }

    /**
     * Transition: RESERVED -> OCCUPIED
     */
    public void checkIn() {
        if (status != SpaceStatus.RESERVED) {
            throw new IllegalStateException("Cannot check-in to space " + spaceId + ": space must be RESERVED first, currently " + status);
        }
        this.status = SpaceStatus.OCCUPIED;
    }

    /**
     * Transition: OCCUPIED -> AVAILABLE
     */
    public void checkOut() {
        if (status != SpaceStatus.OCCUPIED) {
            throw new IllegalStateException("Cannot check-out from space " + spaceId + ": space is not OCCUPIED, currently " + status);
        }
        this.status = SpaceStatus.AVAILABLE;
    }

    /**
     * Transition: RESERVED -> AVAILABLE (on cancellation)
     */
    public void cancel() {
        if (status != SpaceStatus.RESERVED) {
            throw new IllegalStateException("Cannot cancel reservation on space " + spaceId + ": space is not RESERVED, currently " + status);
        }
        this.status = SpaceStatus.AVAILABLE;
    }

    /**
     * Transition: RESERVED -> AVAILABLE (on expiration)
     */
    public void expire() {
        if (status != SpaceStatus.RESERVED) {
            throw new IllegalStateException("Cannot expire reservation on space " + spaceId + ": space is not RESERVED, currently " + status);
        }
        this.status = SpaceStatus.AVAILABLE;
    }

    /**
     * Reset space to available (administrative action)
     */
    public void reset() {
        this.status = SpaceStatus.AVAILABLE;
    }

    /**
     * Polymorphic method to verify if a vehicle is compatible with this space.
     *
     * @param vehicle the vehicle requesting allocation
     * @return true if compatible, false otherwise
     */
    public abstract boolean acceptsVehicle(Vehicle vehicle);

    /**
     * Returns the human-readable space type.
     */
    public abstract String getSpaceType();

    @Override
    public String toString() {
        return String.format("[%s] Lot: %-6s Type: %-12s Status: %-10s",
                spaceId, lotId, getSpaceType(), status);
    }
}
