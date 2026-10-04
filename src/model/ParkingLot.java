package model;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a physical parking lot facility in Idam Nagar.
 * Composed of multiple parking spaces and mapped to a specific road network node.
 */
public class ParkingLot {
    private String lotId;
    private String lotName;
    private String locationNode;
    private ArrayList<ParkingSpace> spaces;

    public ParkingLot(String lotId, String lotName, String locationNode) {
        if (lotId == null || lotId.trim().isEmpty()) {
            throw new IllegalArgumentException("Lot ID cannot be empty.");
        }
        this.lotId = lotId.trim();
        this.lotName = (lotName != null) ? lotName.trim() : lotId;
        this.locationNode = (locationNode != null) ? locationNode.trim() : "";
        this.spaces = new ArrayList<>();
    }

    public String getLotId() {
        return lotId;
    }

    public String getLotName() {
        return lotName;
    }

    public String getLocationNode() {
        return locationNode;
    }

    public void setLocationNode(String locationNode) {
        this.locationNode = locationNode;
    }

    public ArrayList<ParkingSpace> getSpaces() {
        return spaces;
    }

    public void addSpace(ParkingSpace space) {
        if (space != null) {
            space.setLotId(this.lotId);
            spaces.add(space);
        }
    }

    public ParkingSpace getSpaceById(String spaceId) {
        for (ParkingSpace space : spaces) {
            if (space.getSpaceId().equalsIgnoreCase(spaceId)) {
                return space;
            }
        }
        return null;
    }

    public int countTotalSpaces() {
        return spaces.size();
    }

    public int countAvailableSpaces() {
        int count = 0;
        for (ParkingSpace space : spaces) {
            if (space.isAvailable()) {
                count++;
            }
        }
        return count;
    }

    public int countReservedSpaces() {
        int count = 0;
        for (ParkingSpace space : spaces) {
            if (space.isReserved()) {
                count++;
            }
        }
        return count;
    }

    public int countOccupiedSpaces() {
        int count = 0;
        for (ParkingSpace space : spaces) {
            if (space.isOccupied()) {
                count++;
            }
        }
        return count;
    }

    public List<ParkingSpace> getSpacesByType(String type) {
        List<ParkingSpace> matched = new ArrayList<>();
        for (ParkingSpace space : spaces) {
            if (space.getSpaceType().equalsIgnoreCase(type)) {
                matched.add(space);
            }
        }
        return matched;
    }

    @Override
    public String toString() {
        return String.format("[%s] %-24s Road Node: %-4s | Total: %2d | Avail: %2d | Res: %2d | Occ: %2d",
                lotId, lotName, locationNode,
                countTotalSpaces(), countAvailableSpaces(), countReservedSpaces(), countOccupiedSpaces());
    }
}
