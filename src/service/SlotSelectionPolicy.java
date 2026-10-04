package service;

import model.ParkingSpace;
import model.Vehicle;
import java.util.List;

/**
 * Abstraction for parking space selection policy.
 * Encapsulates compatibility validation and best-fit space prioritization.
 */
public interface SlotSelectionPolicy {

    /**
     * Determines whether a parking space can accommodate the given vehicle.
     *
     * @param space   the parking space candidate
     * @param vehicle the vehicle requesting allocation
     * @return true if compatible, false otherwise
     */
    boolean isCompatible(ParkingSpace space, Vehicle vehicle);

    /**
     * Chooses the best parking space among a list of eligible candidates.
     *
     * @param candidateSpaces list of compatible, conflict-free spaces
     * @param vehicle         the requesting vehicle
     * @return selected parking space or null if list is empty
     */
    ParkingSpace selectBestSpace(List<ParkingSpace> candidateSpaces, Vehicle vehicle);
}
