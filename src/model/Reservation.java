package model;

/**
 * Represents a parking reservation for a vehicle at a designated space.
 * Manages fixed-interval time windows, conflict detection, and lifecycle status.
 */
public class Reservation {
    private String reservationId;
    private Vehicle vehicle;
    private ParkingSpace space;
    private int startTime; // Minutes from 00:00 (e.g. 540 = 09:00)
    private int endTime;   // Minutes from 00:00 (e.g. 660 = 11:00)
    private ReservationStatus status;
    private int createdAt; // Simulated request/booking time
    private int expiryDeadline; // Exact 20-minute reservation timeout deadline

    public Reservation(String reservationId, Vehicle vehicle, ParkingSpace space,
                       int startTime, int endTime, int createdAt) {
        this(reservationId, vehicle, space, startTime, endTime, createdAt, Math.max(createdAt, startTime) + 20);
    }

    public Reservation(String reservationId, Vehicle vehicle, ParkingSpace space,
                       int startTime, int endTime, int createdAt, int expiryDeadline) {
        if (reservationId == null || reservationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Reservation ID cannot be empty.");
        }
        if (vehicle == null) {
            throw new IllegalArgumentException("Vehicle cannot be null.");
        }
        if (space == null) {
            throw new IllegalArgumentException("Parking space cannot be null.");
        }
        if (startTime >= endTime) {
            throw new IllegalArgumentException("End time (" + formatTime(endTime) +
                    ") must be strictly greater than start time (" + formatTime(startTime) + ").");
        }
        this.reservationId = reservationId.trim();
        this.vehicle = vehicle;
        this.space = space;
        this.startTime = startTime;
        this.endTime = endTime;
        this.createdAt = createdAt;
        this.expiryDeadline = expiryDeadline;
        this.status = ReservationStatus.RESERVED;
    }

    public String getReservationId() {
        return reservationId;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public ParkingSpace getSpace() {
        return space;
    }

    public void setSpace(ParkingSpace space) {
        if (space == null) {
            throw new IllegalArgumentException("Parking space cannot be null.");
        }
        this.space = space;
    }

    public int getStartTime() {
        return startTime;
    }

    public int getEndTime() {
        return endTime;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public int getCreatedAt() {
        return createdAt;
    }

    public int getExpiryDeadline() {
        return expiryDeadline;
    }

    public void setExpiryDeadline(int expiryDeadline) {
        this.expiryDeadline = expiryDeadline;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    /**
     * Checks if this reservation is currently active (occupying or reserving the time slot).
     * Overstaying vehicles physically occupy the slot and must block new bookings.
     * Cancelled, expired, or completed reservations do not block time intervals.
     */
    public boolean isActiveSlot() {
        return status == ReservationStatus.RESERVED || status == ReservationStatus.CHECKED_IN || status == ReservationStatus.OVERSTAY;
    }

    /**
     * Interval conflict detection logic:
     * Overlaps if: newStart < existingEnd AND newEnd > existingStart
     *
     * @param newStart candidate start time in minutes
     * @param newEnd   candidate end time in minutes
     * @return true if conflict exists, false otherwise
     */
    public boolean overlaps(int newStart, int newEnd) {
        if (!isActiveSlot()) {
            return false;
        }
        return newStart < this.endTime && newEnd > this.startTime;
    }

    /**
     * Transition: RESERVED -> CHECKED_IN
     */
    public void checkIn() {
        if (status != ReservationStatus.RESERVED) {
            throw new IllegalStateException("Cannot check in: reservation " + reservationId +
                    " status is " + status + " (must be RESERVED).");
        }
        space.checkIn();
        this.status = ReservationStatus.CHECKED_IN;
    }

    /**
     * Transition: CHECKED_IN, OVERSTAY, or RESERVED -> COMPLETED
     */
    public void checkOut() {
        if (status != ReservationStatus.CHECKED_IN && status != ReservationStatus.OVERSTAY && status != ReservationStatus.RESERVED) {
            throw new IllegalStateException("Cannot check out: reservation " + reservationId +
                    " status is " + status + " (must be RESERVED, CHECKED_IN, or OVERSTAY).");
        }
        if (space != null) {
            if (space.getStatus() == SpaceStatus.OCCUPIED) {
                space.checkOut();
            } else if (space.getStatus() == SpaceStatus.RESERVED) {
                space.cancel();
            }
        }
        this.status = ReservationStatus.COMPLETED;
    }

    /**
     * Transition: CHECKED_IN -> OVERSTAY
     * Flags vehicle that exceeded expected end time without releasing the occupied stall.
     */
    public void markOverstay() {
        if (status == ReservationStatus.CHECKED_IN) {
            this.status = ReservationStatus.OVERSTAY;
        }
    }

    /**
     * Transition: RESERVED -> CANCELLED
     */
    public void cancel() {
        if (status != ReservationStatus.RESERVED) {
            throw new IllegalStateException("Cannot cancel: reservation " + reservationId +
                    " status is " + status + " (only RESERVED bookings can be cancelled).");
        }
        space.cancel();
        this.status = ReservationStatus.CANCELLED;
    }

    /**
     * Transition: RESERVED -> EXPIRED
     */
    public void expire() {
        if (status != ReservationStatus.RESERVED) {
            throw new IllegalStateException("Cannot expire: reservation " + reservationId +
                    " status is " + status + " (only active RESERVED bookings can expire).");
        }
        space.expire();
        this.status = ReservationStatus.EXPIRED;
    }

    public static String formatTime(int minutes) {
        int hours = (minutes / 60) % 24;
        int mins = minutes % 60;
        return String.format("%02d:%02d", hours, mins);
    }

    @Override
    public String toString() {
        return String.format("[%s] Veh: %-10s Space: %-8s Lot: %-6s Time: %s - %s | Status: %-10s",
                reservationId, vehicle.getVehicleId(), space.getSpaceId(), space.getLotId(),
                formatTime(startTime), formatTime(endTime), status);
    }
}
