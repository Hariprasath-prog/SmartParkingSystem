package service;

import model.ParkingSpace;
import model.Reservation;
import model.ReservationStatus;
import model.Vehicle;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service class responsible for managing reservation lifecycle,
 * interval conflict detection, and grace-period expiration.
 */
public class ReservationManager {

    // Fast O(1) lookup by reservation ID
    private final Map<String, Reservation> reservationMap;

    // Ordered chronological log of all reservations
    private final List<Reservation> reservationHistory;

    private int idCounter = 1000;

    public ReservationManager() {
        this.reservationMap = new HashMap<>();
        this.reservationHistory = new ArrayList<>();
    }

    /**
     * Interval conflict detection algorithm:
     * Validates whether any active reservation on this space overlaps with [startTime, endTime].
     * Two intervals overlap if: newStart < existingEnd AND newEnd > existingStart.
     *
     * @param spaceId   identifier of space
     * @param startTime requested start in minutes
     * @param endTime   requested end in minutes
     * @return true if conflict detected, false otherwise
     */
    public synchronized boolean hasOverlappingReservation(String spaceId, int startTime, int endTime) {
        for (Reservation res : reservationHistory) {
            if (res.getSpace().getSpaceId().equalsIgnoreCase(spaceId)) {
                if (res.overlaps(startTime, endTime)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Creates and stores a new reservation.
     */
    public synchronized Reservation createReservation(Vehicle vehicle, ParkingSpace space,
                                                       int startTime, int endTime, int currentTime) {
        if (hasOverlappingReservation(space.getSpaceId(), startTime, endTime)) {
            throw new IllegalStateException("Space " + space.getSpaceId() +
                    " has an overlapping reservation during " +
                    Reservation.formatTime(startTime) + " - " + Reservation.formatTime(endTime));
        }

        String reservationId = "RES-" + (++idCounter);
        // Reserve the physical space
        space.reserve();

        Reservation res = new Reservation(reservationId, vehicle, space, startTime, endTime, currentTime);
        reservationMap.put(reservationId, res);
        reservationHistory.add(res);
        return res;
    }

    public synchronized Reservation getReservation(String reservationId) {
        if (reservationId == null) {
            return null;
        }
        return reservationMap.get(reservationId.trim().toUpperCase());
    }

    /**
     * Cancels an active reservation, freeing the parking space.
     */
    public synchronized Reservation cancelReservation(String reservationId) {
        Reservation res = getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " not found.");
        }
        res.cancel();
        return res;
    }

    /**
     * Checks in a vehicle for an active reservation.
     */
    public synchronized Reservation checkIn(String reservationId, int currentTime) {
        Reservation res = getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " not found.");
        }
        res.checkIn();
        return res;
    }

    /**
     * Checks out a vehicle, completing the reservation and freeing the space.
     */
    public synchronized Reservation checkOut(String reservationId) {
        Reservation res = getReservation(reservationId);
        if (res == null) {
            throw new IllegalArgumentException("Reservation " + reservationId + " not found.");
        }
        res.checkOut();
        return res;
    }

    /**
     * Scans all reservations and expires any unfulfilled active reservations
     * where currentTime > expiryDeadline.
     *
     * @param currentTime        simulated clock in minutes
     * @param gracePeriodMinutes allowable late check-in grace period
     * @return list of reservations expired in this pass
     */
    public synchronized List<Reservation> processExpiredReservations(int currentTime, int gracePeriodMinutes) {
        List<Reservation> expiredList = new ArrayList<>();
        for (Reservation res : reservationHistory) {
            if (res.getStatus() == ReservationStatus.RESERVED) {
                int expiryDeadline = res.getExpiryDeadline();
                if (expiryDeadline <= 0) {
                    expiryDeadline = res.getStartTime() + gracePeriodMinutes;
                }
                if (currentTime > expiryDeadline) {
                    res.expire();
                    expiredList.add(res);
                }
            }
        }
        return expiredList;
    }

    /**
     * Scans checked-in reservations and flags vehicles that exceeded their booking duration.
     * Overstaying vehicles remain physically OCCUPIED and do NOT release their stalls.
     */
    public synchronized List<Reservation> checkOverstays(int currentTime) {
        List<Reservation> overstayList = new ArrayList<>();
        for (Reservation res : reservationHistory) {
            if (res.getStatus() == ReservationStatus.CHECKED_IN) {
                if (currentTime > res.getEndTime()) {
                    res.markOverstay();
                    overstayList.add(res);
                }
            }
        }
        return overstayList;
    }

    public List<Reservation> getAllReservations() {
        return Collections.unmodifiableList(reservationHistory);
    }

    public List<Reservation> getReservationsByVehicle(String vehicleId) {
        List<Reservation> list = new ArrayList<>();
        for (Reservation res : reservationHistory) {
            if (res.getVehicle().getVehicleId().equalsIgnoreCase(vehicleId)) {
                list.add(res);
            }
        }
        return list;
    }

    public List<Reservation> getActiveReservations() {
        List<Reservation> list = new ArrayList<>();
        for (Reservation res : reservationHistory) {
            if (res.isActiveSlot()) {
                list.add(res);
            }
        }
        return list;
    }
}
