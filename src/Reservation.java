package model;

public class Reservation {

    private String reservationId;
    private Vehicle vehicle;
    private ParkingSpace space;

    private int startTime;
    private int endTime;

    private ReservationStatus status;

    public Reservation(String reservationId,
                       Vehicle vehicle,
                       ParkingSpace space,
                       int startTime,
                       int endTime) {

        if (startTime >= endTime) {
            throw new IllegalArgumentException(
                    "End time must be greater than start time."
            );
        }

        this.reservationId = reservationId;
        this.vehicle = vehicle;
        this.space = space;
        this.startTime = startTime;
        this.endTime = endTime;

        this.status = ReservationStatus.ACTIVE;
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

    public int getStartTime() {
        return startTime;
    }

    public int getEndTime() {
        return endTime;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void cancel() {

        if (status != ReservationStatus.ACTIVE) {

            throw new IllegalStateException(
                    "Only active reservations can be cancelled."
            );
        }

        status = ReservationStatus.CANCELLED;
    }

    public void checkIn() {

        if (status != ReservationStatus.ACTIVE) {

            throw new IllegalStateException(
                    "Reservation is not active."
            );
        }

        space.occupy();
        status = ReservationStatus.CHECKED_IN;
    }

    public void checkOut() {

        if (status != ReservationStatus.CHECKED_IN) {

            throw new IllegalStateException(
                    "Vehicle is not checked in."
            );
        }

        space.release();
    }

    public void expire() {

        if (status == ReservationStatus.ACTIVE) {
            status = ReservationStatus.EXPIRED;
        }
    }

    public boolean overlaps(int newStart, int newEnd) {

        return startTime < newEnd &&
               newStart < endTime;
    }

    @Override
    public String toString() {

        return "Reservation ID: " + reservationId +
                ", Vehicle: " + vehicle.getVehicleId() +
                ", Space: " + space.getSpaceId() +
                ", Time: " + formatTime(startTime) +
                " - " + formatTime(endTime) +
                ", Status: " + status;
    }

    private String formatTime(int minutes) {

        int hour = minutes / 60;
        int minute = minutes % 60;

        return String.format("%02d:%02d", hour, minute);
    }
}