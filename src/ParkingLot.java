package model;

import java.util.ArrayList;

public class ParkingLot {

    private String lotId;
    private String lotName;
    private String location;

    private ArrayList<ParkingSpace> spaces;

    public ParkingLot(String lotId, String lotName,
                      String location) {

        this.lotId = lotId;
        this.lotName = lotName;
        this.location = location;

        spaces = new ArrayList<>();
    }

    public String getLotId() {
        return lotId;
    }

    public String getLotName() {
        return lotName;
    }

    public String getLocation() {
        return location;
    }

    public ArrayList<ParkingSpace> getSpaces() {
        return spaces;
    }

    public void addSpace(ParkingSpace space) {

        spaces.add(space);
    }

    public void displaySpaces() {

        System.out.println("\nParking Lot: " + lotName);

        if (spaces.isEmpty()) {
            System.out.println("No parking spaces available.");
            return;
        }

        for (ParkingSpace space : spaces) {
            System.out.println(space);
        }
    }

    @Override
    public String toString() {

        return "Lot ID: " + lotId +
                ", Name: " + lotName +
                ", Location: " + location +
                ", Total Spaces: " + spaces.size();
    }
}