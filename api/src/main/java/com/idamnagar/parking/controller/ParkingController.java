package com.idamnagar.parking.controller;

import com.idamnagar.parking.dto.BookingRequestDTO;
import com.idamnagar.parking.dto.BookingResponseDTO;
import com.idamnagar.parking.service.ParkingSystemService;
import model.*;
import service.ParkingOperationsController.AllocationResult;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST API Controller for the Smart Parking Allocation System.
 *
 * All business logic is delegated to the existing Java backend.
 * This controller only marshals/unmarshals JSON and calls ParkingSystemService.
 *
 * Base URL: http://localhost:8080/api
 */
@RestController
@RequestMapping("/api")
public class ParkingController {

    @Autowired
    private ParkingSystemService service;

    // ============================================================
    // DASHBOARD: GET /api/dashboard
    // Returns aggregated statistics calculated from actual slot data
    // ============================================================

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        List<ParkingLot> lots = service.getAllLots();
        List<ParkingSpace> spaces = service.getAllSpaces();
        List<Reservation> reservations = service.getAllReservations();

        int total = spaces.size();
        int available = (int) spaces.stream().filter(ParkingSpace::isAvailable).count();
        int reserved  = (int) spaces.stream().filter(ParkingSpace::isReserved).count();
        int occupied  = (int) spaces.stream().filter(ParkingSpace::isOccupied).count();

        long activeRes   = reservations.stream().filter(r -> r.isActiveSlot()).count();
        long expiredRes  = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.EXPIRED).count();
        long completedRes = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED).count();
        long cancelledRes = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.CANCELLED).count();

        double occupancyPct = total > 0 ? Math.round(((double)(occupied + reserved) / total) * 1000.0) / 10.0 : 0;

        int simTime = service.getCurrentSimulatedTime();

        List<Map<String, Object>> lotStats = new ArrayList<>();
        for (ParkingLot lot : lots) {
            Map<String, Object> ls = new LinkedHashMap<>();
            ls.put("lotId", lot.getLotId());
            ls.put("lotName", lot.getLotName());
            ls.put("locationNode", lot.getLocationNode());
            ls.put("total", lot.countTotalSpaces());
            ls.put("available", lot.countAvailableSpaces());
            ls.put("reserved", lot.countReservedSpaces());
            ls.put("occupied", lot.countOccupiedSpaces());
            lotStats.add(ls);
        }

        // Recent reservations (last 10)
        List<Map<String, Object>> recentReservations = new ArrayList<>();
        List<Reservation> allRes = new ArrayList<>(reservations);
        int start = Math.max(0, allRes.size() - 10);
        for (int i = allRes.size() - 1; i >= start; i--) {
            recentReservations.add(mapReservation(allRes.get(i)));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalSpaces", total);
        response.put("availableSpaces", available);
        response.put("reservedSpaces", reserved);
        response.put("occupiedSpaces", occupied);
        response.put("activeReservations", activeRes);
        response.put("expiredReservations", expiredRes);
        response.put("completedReservations", completedRes);
        response.put("cancelledReservations", cancelledRes);
        response.put("occupancyPercentage", occupancyPct);
        response.put("simulatedTime", simTime);
        response.put("simulatedTimeFormatted", Reservation.formatTime(simTime));
        response.put("lots", lotStats);
        response.put("recentReservations", recentReservations);

        return ResponseEntity.ok(response);
    }

    // ============================================================
    // PARKING LOTS: GET /api/lots
    // ============================================================

    @GetMapping("/lots")
    public ResponseEntity<List<Map<String, Object>>> getAllLots() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ParkingLot lot : service.getAllLots()) {
            result.add(mapLot(lot));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/lots/{lotId}")
    public ResponseEntity<?> getLot(@PathVariable String lotId) {
        ParkingLot lot = service.getLot(lotId);
        if (lot == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapLot(lot));
    }

    // ============================================================
    // PARKING SPACES: GET /api/spaces
    // ============================================================

    @GetMapping("/spaces")
    public ResponseEntity<List<Map<String, Object>>> getAllSpaces(
            @RequestParam(required = false) String lotId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {

        List<ParkingSpace> spaces = service.getAllSpaces();

        if (lotId != null && !lotId.isBlank()) {
            spaces = spaces.stream()
                    .filter(s -> s.getLotId().equalsIgnoreCase(lotId))
                    .toList();
        }
        if (status != null && !status.isBlank()) {
            spaces = spaces.stream()
                    .filter(s -> s.getStatus().name().equalsIgnoreCase(status))
                    .toList();
        }
        if (type != null && !type.isBlank()) {
            spaces = spaces.stream()
                    .filter(s -> s.getSpaceType().equalsIgnoreCase(type))
                    .toList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (ParkingSpace space : spaces) {
            result.add(mapSpace(space));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/spaces/{spaceId}")
    public ResponseEntity<?> getSpace(@PathVariable String spaceId) {
        ParkingSpace space = service.getSpace(spaceId);
        if (space == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapSpace(space));
    }

    // ============================================================
    // VEHICLES: GET /api/vehicles
    // ============================================================

    @GetMapping("/vehicles")
    public ResponseEntity<List<Map<String, Object>>> getAllVehicles() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Vehicle vehicle : service.getAllVehicles()) {
            result.add(mapVehicle(vehicle));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/vehicles/{vehicleId}")
    public ResponseEntity<?> getVehicle(@PathVariable String vehicleId) {
        Vehicle v = service.getVehicle(vehicleId);
        if (v == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapVehicle(v));
    }

    @PostMapping("/vehicles/register")
    public ResponseEntity<?> registerVehicle(@RequestBody Map<String, Object> body) {
        try {
            String vehicleId = (String) body.get("vehicleId");
            String ownerName = (String) body.getOrDefault("ownerName", "Unknown");
            String typeStr   = (String) body.getOrDefault("vehicleType", "CAR");
            boolean permit   = Boolean.parseBoolean(body.getOrDefault("accessiblePermit", false).toString());

            VehicleType type = VehicleType.valueOf(typeStr.toUpperCase());
            Vehicle v = new Vehicle(vehicleId, ownerName, type, permit);
            service.registerVehicle(v);
            return ResponseEntity.ok(Map.of("success", true, "message", "Vehicle registered successfully.", "vehicle", mapVehicle(v)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // RESERVATIONS: GET /api/reservations
    // ============================================================

    @GetMapping("/reservations")
    public ResponseEntity<List<Map<String, Object>>> getAllReservations(
            @RequestParam(required = false) String vehicleId,
            @RequestParam(required = false) String status) {

        List<Reservation> reservations = vehicleId != null && !vehicleId.isBlank()
                ? service.getReservationsByVehicle(vehicleId)
                : service.getAllReservations();

        if (status != null && !status.isBlank()) {
            reservations = reservations.stream()
                    .filter(r -> r.getStatus().name().equalsIgnoreCase(status))
                    .toList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Reservation r : reservations) {
            result.add(mapReservation(r));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/reservations/{reservationId}")
    public ResponseEntity<?> getReservation(@PathVariable String reservationId) {
        Reservation r = service.getReservation(reservationId);
        if (r == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mapReservation(r));
    }

    // ============================================================
    // BOOKING: POST /api/bookings
    // Core allocation — delegates entirely to existing Java backend
    // ============================================================

    @PostMapping("/bookings")
    public ResponseEntity<BookingResponseDTO> createBooking(@RequestBody BookingRequestDTO req) {
        BookingResponseDTO dto = new BookingResponseDTO();

        try {
            // Auto-register vehicle if not already known
            if (service.getVehicle(req.getVehicleId()) == null) {
                if (req.getVehicleType() == null || req.getVehicleType().isBlank()) {
                    dto.setSuccess(false);
                    dto.setMessage("Vehicle " + req.getVehicleId() + " is not registered. Please provide vehicle type to auto-register.");
                    return ResponseEntity.badRequest().body(dto);
                }
                VehicleType type = VehicleType.valueOf(req.getVehicleType().toUpperCase());
                String owner = req.getOwnerName() != null ? req.getOwnerName() : "Unknown";
                service.registerVehicle(new Vehicle(req.getVehicleId(), owner, type, req.isAccessiblePermit()));
            }

            int priority = req.isAccessiblePermit() ? 1 : (req.getAccessPriority() > 0 ? req.getAccessPriority() : 2);

            // Delegate ALL allocation logic to existing backend
            AllocationResult result = service.requestAllocation(
                    req.getVehicleId(),
                    req.getOriginNode(),
                    req.getStartTime(),
                    req.getEndTime(),
                    priority
            );

            dto.setSuccess(result.isSuccess());
            dto.setMessage(result.getMessage());

            if (result.isSuccess() && result.getReservation() != null) {
                Reservation res = result.getReservation();
                dto.setReservationId(res.getReservationId());
                dto.setVehicleId(res.getVehicle().getVehicleId());
                dto.setOwnerName(res.getVehicle().getOwnerName());
                dto.setVehicleType(res.getVehicle().getType().name());
                dto.setSpaceId(res.getSpace().getSpaceId());
                dto.setSpaceType(res.getSpace().getSpaceType());
                dto.setLotId(res.getSpace().getLotId());
                dto.setLotName(result.getSelectedLot() != null ? result.getSelectedLot().getLotName() : res.getSpace().getLotId());
                dto.setStartTime(res.getStartTime());
                dto.setEndTime(res.getEndTime());
                dto.setStartTimeFormatted(Reservation.formatTime(res.getStartTime()));
                dto.setEndTimeFormatted(Reservation.formatTime(res.getEndTime()));
                dto.setStatus(res.getStatus().name());
                dto.setTravelTimeMinutes(result.getTravelTimeMinutes());
                dto.setTravelRoute(result.getTravelRoute());
                dto.setQueued(false);
                return ResponseEntity.ok(dto);
            }

            if (result.getQueuedRequest() != null) {
                dto.setQueued(true);
                dto.setRequestId(result.getQueuedRequest().getRequestId());
                dto.setQueuePriority(result.getQueuedRequest().getAccessPriority());
                return ResponseEntity.ok(dto);
            }

            return ResponseEntity.badRequest().body(dto);

        } catch (IllegalArgumentException e) {
            dto.setSuccess(false);
            dto.setMessage(e.getMessage());
            return ResponseEntity.badRequest().body(dto);
        } catch (Exception e) {
            dto.setSuccess(false);
            dto.setMessage("An unexpected error occurred: " + e.getMessage());
            return ResponseEntity.internalServerError().body(dto);
        }
    }

    // ============================================================
    // CHECK-IN: POST /api/bookings/{reservationId}/checkin
    // ============================================================

    @PostMapping("/bookings/{reservationId}/checkin")
    public ResponseEntity<?> checkIn(@PathVariable String reservationId,
                                      @RequestBody(required = false) Map<String, String> body) {
        try {
            String vehicleId = (body != null) ? body.get("vehicleId") : null;
            Reservation res = service.checkIn(reservationId, vehicleId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vehicle checked in successfully.",
                    "reservation", mapReservation(res)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // CHECK-OUT: POST /api/bookings/{reservationId}/checkout
    // ============================================================

    @PostMapping("/bookings/{reservationId}/checkout")
    public ResponseEntity<?> checkOut(@PathVariable String reservationId) {
        try {
            Reservation res = service.checkOut(reservationId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vehicle checked out. Reservation completed. Slot released.",
                    "reservation", mapReservation(res)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // CANCEL: POST /api/bookings/{reservationId}/cancel
    // ============================================================

    @PostMapping("/bookings/{reservationId}/cancel")
    public ResponseEntity<?> cancelReservation(@PathVariable String reservationId) {
        try {
            Reservation res = service.cancelReservation(reservationId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Reservation cancelled. Slot released.",
                    "reservation", mapReservation(res)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // ADMIN: Process expired reservations
    // POST /api/admin/process-expired
    // ============================================================

    @PostMapping("/admin/process-expired")
    public ResponseEntity<?> processExpired() {
        try {
            List<Reservation> expired = service.processExpiredReservations();
            List<Map<String, Object>> expiredDTOs = new ArrayList<>();
            for (Reservation r : expired) expiredDTOs.add(mapReservation(r));
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "expiredCount", expired.size(),
                    "expiredReservations", expiredDTOs
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // SIMULATED TIME: GET/PUT /api/admin/time
    // ============================================================

    @GetMapping("/admin/time")
    public ResponseEntity<?> getTime() {
        int t = service.getCurrentSimulatedTime();
        return ResponseEntity.ok(Map.of(
                "simulatedTime", t,
                "simulatedTimeFormatted", Reservation.formatTime(t)
        ));
    }

    @PutMapping("/admin/time")
    public ResponseEntity<?> setTime(@RequestBody Map<String, Integer> body) {
        try {
            if (body.containsKey("minutes")) {
                service.setSimulatedTime(body.get("minutes"));
            } else if (body.containsKey("advance")) {
                service.advanceSimulatedTime(body.get("advance"));
            }
            int t = service.getCurrentSimulatedTime();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "simulatedTime", t,
                    "simulatedTimeFormatted", Reservation.formatTime(t)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ============================================================
    // WAITING QUEUE: GET /api/admin/queue
    // ============================================================

    @GetMapping("/admin/queue")
    public ResponseEntity<?> getWaitingQueue() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (model.ParkingRequest req : service.getWaitingRequests()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("requestId", req.getRequestId());
            m.put("vehicleId", req.getVehicle().getVehicleId());
            m.put("ownerName", req.getVehicle().getOwnerName());
            m.put("vehicleType", req.getVehicle().getType().name());
            m.put("requestTime", req.getRequestTime());
            m.put("requestTimeFormatted", Reservation.formatTime(req.getRequestTime()));
            m.put("startTime", req.getRequestedStartTime());
            m.put("endTime", req.getRequestedEndTime());
            m.put("startTimeFormatted", Reservation.formatTime(req.getRequestedStartTime()));
            m.put("endTimeFormatted", Reservation.formatTime(req.getRequestedEndTime()));
            m.put("accessPriority", req.getAccessPriority());
            m.put("originNode", req.getOriginNode());
            m.put("status", req.getStatus());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    // ============================================================
    // ROAD NETWORK: GET /api/graph/nodes
    // ============================================================

    @GetMapping("/graph/nodes")
    public ResponseEntity<?> getGraphNodes() {
        List<Map<String, Object>> result = new ArrayList<>();
        service.getRoadNetwork().getAllNodes().forEach((id, node) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", node.getId());
            m.put("name", node.getName());
            result.add(m);
        });
        return ResponseEntity.ok(result);
    }

    // ============================================================
    // HELPER MAPPERS: Java Object -> JSON Map
    // ============================================================

    private Map<String, Object> mapLot(ParkingLot lot) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("lotId", lot.getLotId());
        m.put("lotName", lot.getLotName());
        m.put("locationNode", lot.getLocationNode());
        m.put("totalSpaces", lot.countTotalSpaces());
        m.put("availableSpaces", lot.countAvailableSpaces());
        m.put("reservedSpaces", lot.countReservedSpaces());
        m.put("occupiedSpaces", lot.countOccupiedSpaces());

        List<Map<String, Object>> spaces = new ArrayList<>();
        for (ParkingSpace space : lot.getSpaces()) {
            spaces.add(mapSpace(space));
        }
        m.put("spaces", spaces);
        return m;
    }

    private Map<String, Object> mapSpace(ParkingSpace space) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("spaceId", space.getSpaceId());
        m.put("lotId", space.getLotId());
        m.put("spaceType", space.getSpaceType());
        m.put("status", space.getStatus().name());
        m.put("isAvailable", space.isAvailable());
        m.put("isReserved", space.isReserved());
        m.put("isOccupied", space.isOccupied());
        return m;
    }

    private Map<String, Object> mapVehicle(Vehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("vehicleId", v.getVehicleId());
        m.put("ownerName", v.getOwnerName());
        m.put("vehicleType", v.getType().name());
        m.put("accessiblePermit", v.hasAccessiblePermit());
        return m;
    }

    private Map<String, Object> mapReservation(Reservation r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reservationId", r.getReservationId());
        m.put("vehicleId", r.getVehicle().getVehicleId());
        m.put("ownerName", r.getVehicle().getOwnerName());
        m.put("vehicleType", r.getVehicle().getType().name());
        m.put("accessiblePermit", r.getVehicle().hasAccessiblePermit());
        m.put("spaceId", r.getSpace().getSpaceId());
        m.put("spaceType", r.getSpace().getSpaceType());
        m.put("lotId", r.getSpace().getLotId());
        m.put("startTime", r.getStartTime());
        m.put("endTime", r.getEndTime());
        m.put("startTimeFormatted", Reservation.formatTime(r.getStartTime()));
        m.put("endTimeFormatted", Reservation.formatTime(r.getEndTime()));
        m.put("status", r.getStatus().name());
        m.put("isActive", r.isActiveSlot());
        m.put("createdAt", r.getCreatedAt());
        m.put("createdAtFormatted", Reservation.formatTime(r.getCreatedAt()));
        return m;
    }
}
