package service;

import model.AccessibleSpace;
import model.ParkingSpace;
import model.Vehicle;
import java.util.List;

/**
 * Default implementation of SlotSelectionPolicy.
 * Enforces polymorphism via ParkingSpace.acceptsVehicle(vehicle).
 * Prioritizes dedicated AccessibleSpace for accessible-permit holders.
 */
public class DefaultSlotSelectionPolicy implements SlotSelectionPolicy {

    @Override
    public boolean isCompatible(ParkingSpace space, Vehicle vehicle) {
        if (space == null || vehicle == null) {
            return false;
        }
        return space.acceptsVehicle(vehicle);
    }

    @Override
    public ParkingSpace selectBestSpace(List<ParkingSpace> candidateSpaces, Vehicle vehicle) {
        if (candidateSpaces == null || candidateSpaces.isEmpty()) {
            return null;
        }

        // Priority 1: If vehicle has an accessible permit, prioritize AccessibleSpace
        if (vehicle.hasAccessiblePermit()) {
            for (ParkingSpace space : candidateSpaces) {
                if (space instanceof AccessibleSpace) {
                    return space;
                }
            }
        }

        // Priority 2: Select first available compatible space
        return candidateSpaces.get(0);
    }
}
