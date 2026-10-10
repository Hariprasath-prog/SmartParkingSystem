package com.idamnagar.parking.service;

import graph.WeightedGraph;
import model.*;
import service.ParkingOperationsController;
import service.ParkingOperationsController.AllocationResult;
import util.SampleData;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.List;

/**
 * Spring Service that wraps the existing ParkingOperationsController.
 * Bridges the console-based Java backend to the Spring Boot REST layer.
 * Does NOT rewrite any business logic — delegates everything to the original classes.
 */
@Service
public class ParkingSystemService {

    private ParkingOperationsController controller;

    @PostConstruct
    public void init() {
        WeightedGraph roadNetwork = SampleData.createRoadNetwork();
        controller = new ParkingOperationsController(roadNetwork);
        SampleData.initializeSystemData(controller);
    }

    // ---- Lots ----
    public List<ParkingLot> getAllLots() {
        return controller.getAllLots();
    }

    public ParkingLot getLot(String lotId) {
        return controller.getLot(lotId);
    }

    // ---- Spaces ----
    public List<ParkingSpace> getAllSpaces() {
        return controller.getAllSpaces();
    }

    public ParkingSpace getSpace(String spaceId) {
        return controller.getSpace(spaceId);
    }

    // ---- Vehicles ----
    public List<Vehicle> getAllVehicles() {
        return controller.getAllVehicles();
    }

    public Vehicle getVehicle(String vehicleId) {
        return controller.getVehicle(vehicleId);
    }

    public void registerVehicle(Vehicle vehicle) {
        controller.registerVehicle(vehicle);
    }

    // ---- Reservations ----
    public List<Reservation> getAllReservations() {
        return controller.getAllReservations();
    }

    public Reservation getReservation(String reservationId) {
        return controller.getReservationManager().getReservation(reservationId);
    }

    public List<Reservation> getReservationsByVehicle(String vehicleId) {
        return controller.getReservationManager().getReservationsByVehicle(vehicleId);
    }

    public List<Reservation> getActiveReservations() {
        return controller.getReservationManager().getActiveReservations();
    }

    // ---- Allocation (core business logic - fully delegated) ----
    public AllocationResult requestAllocation(String vehicleId, String originNode,
                                               int startTime, int endTime, int accessPriority) {
        return controller.requestParkingAllocation(vehicleId, originNode, startTime, endTime, accessPriority);
    }

    // ---- Check-in / Check-out / Cancel ----
    public Reservation checkIn(String reservationId, String vehicleId) {
        return controller.checkIn(reservationId, vehicleId);
    }

    public Reservation checkOut(String reservationId) {
        return controller.checkOut(reservationId);
    }

    public Reservation cancelReservation(String reservationId) {
        return controller.cancelReservation(reservationId);
    }

    // ---- Expiry Processing ----
    public List<Reservation> processExpiredReservations() {
        return controller.processExpiredReservations(ParkingOperationsController.DEFAULT_GRACE_PERIOD_MINUTES);
    }

    // ---- Simulated Time ----
    public int getCurrentSimulatedTime() {
        return controller.getCurrentSimulatedTime();
    }

    public void setSimulatedTime(int minutes) {
        controller.setSimulatedTime(minutes);
    }

    public void advanceSimulatedTime(int minutes) {
        controller.advanceSimulatedTime(minutes);
    }

    // ---- Waiting Queue ----
    public List<model.ParkingRequest> getWaitingRequests() {
        return controller.getWaitingRequests();
    }

    // ---- Road Network ----
    public WeightedGraph getRoadNetwork() {
        return controller.getRoadNetwork();
    }
}
