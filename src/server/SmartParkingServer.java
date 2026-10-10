package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import graph.GraphNode;
import graph.WeightedGraph;
import model.ParkingLot;
import model.ParkingRequest;
import model.ParkingSpace;
import model.Reservation;
import model.ReservationStatus;
import model.Vehicle;
import model.VehicleType;
import service.ParkingOperationsController;
import service.ParkingOperationsController.AllocationResult;
import util.SampleData;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Built-in zero-dependency HTTP & REST server for the Smart Parking Allocation System.
 * Uses Java's built-in com.sun.net.httpserver.HttpServer.
 *
 * Provides full REST API on http://localhost:8080/api and also serves the static frontend.
 */
public class SmartParkingServer {

    private static final int PORT = 8080;
    private static ParkingOperationsController controller;
    private static File frontendDir;

    public static void main(String[] args) throws IOException {
        // 1. Initialize road graph and sample data
        WeightedGraph roadNetwork = SampleData.createRoadNetwork();
        controller = new ParkingOperationsController(roadNetwork);
        SampleData.initializeSystemData(controller);

        // 2. Locate frontend directory
        frontendDir = new File("frontend");
        if (!frontendDir.exists()) {
            frontendDir = new File("../frontend");
        }

        // 3. Create HTTP Server
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // API Handler
        server.createContext("/api", new ApiHandler());

        // Static Frontend Handler
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null); // default executor
        server.start();

        // 4. Background Server-Side 20-Minute Expiration & Overstay Poller (Section 4)
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "server-expiry-poller");
            t.setDaemon(true);
            return t;
        });
        scheduler.scheduleWithFixedDelay(() -> {
            try {
                if (controller != null) {
                    controller.processExpiredReservations(20);
                    controller.checkOverstays();
                }
            } catch (Throwable ignored) {}
        }, 3, 3, TimeUnit.SECONDS);

        System.out.println("====================================================================");
        System.out.println("  IDAM NAGAR SMART PARKING SYSTEM — WEB & REST API SERVER STARTED   ");
        System.out.println("====================================================================");
        System.out.println("  Web UI URL : http://localhost:" + PORT);
        System.out.println("  REST API   : http://localhost:" + PORT + "/api");
        System.out.println("  Dashboard  : http://localhost:" + PORT + "/api/dashboard");
        System.out.println("  Scheduler  : Active (20-min arrival timeout + overstay detection)  ");
        System.out.println("====================================================================");
    }

    // =========================================================================
    // REST API HANDLER
    // =========================================================================

    private static class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod().toUpperCase();
            String path = exchange.getRequestURI().getPath();
            String query = exchange.getRequestURI().getQuery();

            // Set CORS Headers
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");

            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if (path.equals("/api/dashboard") && "GET".equals(method)) {
                    handleDashboard(exchange);
                } else if (path.equals("/api/lots") && "GET".equals(method)) {
                    handleGetLots(exchange);
                } else if (path.equals("/api/lots/suggestions") && "GET".equals(method)) {
                    handleGetLotSuggestions(exchange, parseQueryParams(query));
                } else if (path.startsWith("/api/lots/") && "GET".equals(method)) {
                    String lotId = URLDecoder.decode(path.substring("/api/lots/".length()), StandardCharsets.UTF_8);
                    handleGetLotById(exchange, lotId);
                } else if (path.equals("/api/spaces") && "GET".equals(method)) {
                    handleGetSpaces(exchange, parseQueryParams(query));
                } else if (path.startsWith("/api/spaces/") && "GET".equals(method)) {
                    String spaceId = URLDecoder.decode(path.substring("/api/spaces/".length()), StandardCharsets.UTF_8);
                    handleGetSpaceById(exchange, spaceId);
                } else if (path.equals("/api/vehicles") && "GET".equals(method)) {
                    handleGetVehicles(exchange);
                } else if (path.startsWith("/api/vehicles/") && "GET".equals(method)) {
                    String vehId = URLDecoder.decode(path.substring("/api/vehicles/".length()), StandardCharsets.UTF_8);
                    handleGetVehicleById(exchange, vehId);
                } else if (path.equals("/api/vehicles/register") && "POST".equals(method)) {
                    handleRegisterVehicle(exchange);
                } else if (path.equals("/api/reservations") && "GET".equals(method)) {
                    handleGetReservations(exchange, parseQueryParams(query));
                } else if (path.startsWith("/api/reservations/") && "GET".equals(method)) {
                    String resId = URLDecoder.decode(path.substring("/api/reservations/".length()), StandardCharsets.UTF_8);
                    handleGetReservationById(exchange, resId);
                } else if (path.equals("/api/bookings") && "POST".equals(method)) {
                    handleCreateBooking(exchange);
                } else if (path.matches("/api/bookings/.+/checkin") && "POST".equals(method)) {
                    String resId = extractMiddlePath(path, "/api/bookings/", "/checkin");
                    handleCheckIn(exchange, resId);
                } else if (path.matches("/api/bookings/.+/checkout") && "POST".equals(method)) {
                    String resId = extractMiddlePath(path, "/api/bookings/", "/checkout");
                    handleCheckOut(exchange, resId);
                } else if (path.matches("/api/bookings/.+/cancel") && "POST".equals(method)) {
                    String resId = extractMiddlePath(path, "/api/bookings/", "/cancel");
                    handleCancelBooking(exchange, resId);
                } else if (path.equals("/api/admin/process-expired") && "POST".equals(method)) {
                    handleProcessExpired(exchange);
                } else if (path.equals("/api/admin/time") && "GET".equals(method)) {
                    handleGetTime(exchange);
                } else if (path.equals("/api/admin/time") && "PUT".equals(method)) {
                    handleSetTime(exchange);
                } else if (path.equals("/api/admin/queue") && "GET".equals(method)) {
                    handleGetQueue(exchange);
                } else if (path.equals("/api/graph/nodes") && "GET".equals(method)) {
                    handleGetGraphNodes(exchange);
                } else {
                    sendJsonResponse(exchange, 404, "{\"error\": \"Endpoint not found\", \"path\": \"" + path + "\"}");
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"success\": false, \"message\": \"" + escapeJson(e.getMessage()) + "\"}");
            }
        }
    }

    // =========================================================================
    // REST ENDPOINT HANDLERS
    // =========================================================================

    private static void handleDashboard(HttpExchange exchange) throws IOException {
        List<ParkingSpace> spaces = controller.getAllSpaces();
        List<Reservation> reservations = controller.getAllReservations();
        List<ParkingLot> lots = controller.getAllLots();

        int total = spaces.size();
        int available = 0, reserved = 0, occupied = 0;
        for (ParkingSpace sp : spaces) {
            if (sp.isAvailable()) available++;
            else if (sp.isReserved()) reserved++;
            else if (sp.isOccupied()) occupied++;
        }

        long activeRes = 0, expiredRes = 0, completedRes = 0, cancelledRes = 0, overstayRes = 0;
        for (Reservation r : reservations) {
            if (r.isActiveSlot()) activeRes++;
            if (r.getStatus() == ReservationStatus.EXPIRED) expiredRes++;
            if (r.getStatus() == ReservationStatus.COMPLETED) completedRes++;
            if (r.getStatus() == ReservationStatus.CANCELLED) cancelledRes++;
            if (r.getStatus() == ReservationStatus.OVERSTAY) overstayRes++;
        }

        double occPct = total > 0 ? Math.round(((double)(occupied + reserved) / total) * 1000.0) / 10.0 : 0;
        int simTime = controller.getCurrentSimulatedTime();

        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"totalSpaces\":").append(total).append(",");
        json.append("\"availableSpaces\":").append(available).append(",");
        json.append("\"reservedSpaces\":").append(reserved).append(",");
        json.append("\"occupiedSpaces\":").append(occupied).append(",");
        json.append("\"activeReservations\":").append(activeRes).append(",");
        json.append("\"expiredReservations\":").append(expiredRes).append(",");
        json.append("\"overstayReservations\":").append(overstayRes).append(",");
        json.append("\"completedReservations\":").append(completedRes).append(",");
        json.append("\"cancelledReservations\":").append(cancelledRes).append(",");
        json.append("\"occupancyPercentage\":").append(occPct).append(",");
        json.append("\"simulatedTime\":").append(simTime).append(",");
        json.append("\"simulatedTimeFormatted\":\"").append(Reservation.formatTime(simTime)).append("\",");

        // Lots array
        json.append("\"lots\":[");
        for (int i = 0; i < lots.size(); i++) {
            if (i > 0) json.append(",");
            ParkingLot lot = lots.get(i);
            json.append("{")
                .append("\"lotId\":\"").append(lot.getLotId()).append("\",")
                .append("\"lotName\":\"").append(escapeJson(lot.getLotName())).append("\",")
                .append("\"locationNode\":\"").append(lot.getLocationNode()).append("\",")
                .append("\"total\":").append(lot.countTotalSpaces()).append(",")
                .append("\"available\":").append(lot.countAvailableSpaces()).append(",")
                .append("\"reserved\":").append(lot.countReservedSpaces()).append(",")
                .append("\"occupied\":").append(lot.countOccupiedSpaces())
                .append("}");
        }
        json.append("],");

        // Recent reservations (last 10)
        json.append("\"recentReservations\":[");
        int count = 0;
        for (int i = reservations.size() - 1; i >= 0 && count < 10; i--, count++) {
            if (count > 0) json.append(",");
            json.append(reservationToJson(reservations.get(i)));
        }
        json.append("]");

        json.append("}");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetLots(HttpExchange exchange) throws IOException {
        List<ParkingLot> lots = controller.getAllLots();
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < lots.size(); i++) {
            if (i > 0) json.append(",");
            json.append(lotToJson(lots.get(i)));
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetLotById(HttpExchange exchange, String lotId) throws IOException {
        ParkingLot lot = controller.getLot(lotId);
        if (lot == null) {
            sendJsonResponse(exchange, 404, "{\"message\":\"Lot " + escapeJson(lotId) + " not found\"}");
            return;
        }
        sendJsonResponse(exchange, 200, lotToJson(lot));
    }

    private static void handleGetSpaces(HttpExchange exchange, Map<String, String> params) throws IOException {
        List<ParkingSpace> spaces = controller.getAllSpaces();
        String lotId = params.get("lotId");
        String status = params.get("status");
        String type = params.get("type");

        StringBuilder json = new StringBuilder("[");
        boolean first = true;
        for (ParkingSpace sp : spaces) {
            if (lotId != null && !lotId.isEmpty() && !sp.getLotId().equalsIgnoreCase(lotId)) continue;
            if (status != null && !status.isEmpty() && !sp.getStatus().name().equalsIgnoreCase(status)) continue;
            if (type != null && !type.isEmpty() && !sp.getSpaceType().equalsIgnoreCase(type)) continue;

            if (!first) json.append(",");
            json.append(spaceToJson(sp));
            first = false;
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetSpaceById(HttpExchange exchange, String spaceId) throws IOException {
        ParkingSpace sp = controller.getSpace(spaceId);
        if (sp == null) {
            sendJsonResponse(exchange, 404, "{\"message\":\"Space " + escapeJson(spaceId) + " not found\"}");
            return;
        }
        sendJsonResponse(exchange, 200, spaceToJson(sp));
    }

    private static void handleGetVehicles(HttpExchange exchange) throws IOException {
        List<Vehicle> vehicles = controller.getAllVehicles();
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < vehicles.size(); i++) {
            if (i > 0) json.append(",");
            json.append(vehicleToJson(vehicles.get(i)));
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetVehicleById(HttpExchange exchange, String vehicleId) throws IOException {
        Vehicle v = controller.getVehicle(vehicleId);
        if (v == null) {
            sendJsonResponse(exchange, 404, "{\"message\":\"Vehicle " + escapeJson(vehicleId) + " not found\"}");
            return;
        }
        sendJsonResponse(exchange, 200, vehicleToJson(v));
    }

    private static void handleRegisterVehicle(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> map = parseSimpleJson(body);

        String vehicleId = map.get("vehicleId");
        String ownerName = map.get("ownerName");
        String vehicleType = map.get("vehicleType");
        boolean accessiblePermit = Boolean.parseBoolean(map.get("accessiblePermit"));

        if (vehicleId == null || vehicleId.trim().isEmpty()) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Vehicle ID is required\"}");
            return;
        }

        VehicleType type = "TWO_WHEELER".equalsIgnoreCase(vehicleType) ? VehicleType.TWO_WHEELER : VehicleType.CAR;
        Vehicle v = new Vehicle(vehicleId.trim().toUpperCase(), ownerName != null ? ownerName.trim() : "", type, accessiblePermit);
        controller.registerVehicle(v);

        sendJsonResponse(exchange, 200, vehicleToJson(v));
    }

    private static void handleGetReservations(HttpExchange exchange, Map<String, String> params) throws IOException {
        List<Reservation> reservations = controller.getAllReservations();
        String vehicleId = params.get("vehicleId");
        String status = params.get("status");

        StringBuilder json = new StringBuilder("[");
        boolean first = true;
        for (Reservation r : reservations) {
            if (vehicleId != null && !vehicleId.isEmpty() && !r.getVehicle().getVehicleId().equalsIgnoreCase(vehicleId)) continue;
            if (status != null && !status.isEmpty() && !r.getStatus().name().equalsIgnoreCase(status)) continue;

            if (!first) json.append(",");
            json.append(reservationToJson(r));
            first = false;
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetReservationById(HttpExchange exchange, String resId) throws IOException {
        Reservation r = controller.getReservationManager().getReservation(resId);
        if (r == null) {
            sendJsonResponse(exchange, 404, "{\"message\":\"Reservation " + escapeJson(resId) + " not found\"}");
            return;
        }
        sendJsonResponse(exchange, 200, reservationToJson(r));
    }

    private static void handleCreateBooking(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> map = parseSimpleJson(body);

        String vehicleId = map.get("vehicleId");
        String ownerName = map.get("ownerName");
        String vehicleType = map.get("vehicleType");
        boolean accessiblePermit = Boolean.parseBoolean(map.get("accessiblePermit"));
        String originNode = map.get("originNode");
        String preferredLotId = map.get("preferredLotId");
        double maxDistanceKm = parseDouble(map.get("maxDistanceKm"), -1.0);
        int startTime = parseInt(map.get("startTime"), 540);
        int endTime = parseInt(map.get("endTime"), 660);
        int accessPriority = parseInt(map.get("accessPriority"), accessiblePermit ? 1 : 2);

        if (vehicleId == null || vehicleId.trim().isEmpty()) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Vehicle ID is required\"}");
            return;
        }

        if (startTime >= endTime) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"End time (" +
                    Reservation.formatTime(endTime) + ") must be strictly after start time (" +
                    Reservation.formatTime(startTime) + ").\"}");
            return;
        }

        vehicleId = vehicleId.trim().toUpperCase();
        Vehicle v = controller.getVehicle(vehicleId);
        if (v == null) {
            VehicleType type = "TWO_WHEELER".equalsIgnoreCase(vehicleType) ? VehicleType.TWO_WHEELER : VehicleType.CAR;
            v = new Vehicle(vehicleId, ownerName != null ? ownerName.trim() : "", type, accessiblePermit);
            controller.registerVehicle(v);
        }

        AllocationResult result = controller.requestParkingAllocation(
                vehicleId, originNode, preferredLotId, maxDistanceKm, startTime, endTime, accessPriority
        );

        // Calculate nearby alternative lot suggestions with Dijkstra
        List<ParkingOperationsController.NearbyLotSuggestion> suggestions =
                controller.getNearbyLotSuggestions(originNode, v, startTime, endTime);

        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"success\":").append(result.isSuccess()).append(",");
        json.append("\"message\":\"").append(escapeJson(result.getMessage())).append("\",");
        json.append("\"timeoutMinutes\":20,");
        json.append("\"gracePeriodMinutes\":20");

        if (result.isSuccess() && result.getReservation() != null) {
            Reservation r = result.getReservation();
            int timeoutDeadline = r.getExpiryDeadline();
            json.append(",\"reservationId\":\"").append(r.getReservationId()).append("\"");
            json.append(",\"vehicleId\":\"").append(r.getVehicle().getVehicleId()).append("\"");
            json.append(",\"ownerName\":\"").append(escapeJson(r.getVehicle().getOwnerName())).append("\"");
            json.append(",\"vehicleType\":\"").append(r.getVehicle().getType().name()).append("\"");
            json.append(",\"spaceId\":\"").append(r.getSpace().getSpaceId()).append("\"");
            json.append(",\"spaceType\":\"").append(r.getSpace().getSpaceType()).append("\"");
            json.append(",\"lotId\":\"").append(r.getSpace().getLotId()).append("\"");
            if (result.getSelectedLot() != null) {
                json.append(",\"lotName\":\"").append(escapeJson(result.getSelectedLot().getLotName())).append("\"");
            }
            json.append(",\"startTime\":").append(r.getStartTime());
            json.append(",\"endTime\":").append(r.getEndTime());
            json.append(",\"startTimeFormatted\":\"").append(Reservation.formatTime(r.getStartTime())).append("\"");
            json.append(",\"endTimeFormatted\":\"").append(Reservation.formatTime(r.getEndTime())).append("\"");
            json.append(",\"timeoutDeadline\":").append(timeoutDeadline);
            json.append(",\"timeoutDeadlineFormatted\":\"").append(Reservation.formatTime(timeoutDeadline)).append("\"");
            json.append(",\"status\":\"").append(r.getStatus().name()).append("\"");
            json.append(",\"travelTimeMinutes\":").append(result.getTravelTimeMinutes());
            json.append(",\"travelRoute\":\"").append(escapeJson(result.getTravelRoute())).append("\"");
        } else if (result.getQueuedRequest() != null) {
            json.append(",\"queued\":true");
            json.append(",\"requestId\":\"").append(result.getQueuedRequest().getRequestId()).append("\"");
            json.append(",\"queuePriority\":").append(result.getQueuedRequest().getAccessPriority());
        } else {
            json.append(",\"conflict\":true");
        }

        // Suggestions array
        json.append(",\"suggestions\":[");
        for (int i = 0; i < suggestions.size(); i++) {
            if (i > 0) json.append(",");
            ParkingOperationsController.NearbyLotSuggestion s = suggestions.get(i);
            json.append("{")
                .append("\"lotId\":\"").append(s.getLotId()).append("\",")
                .append("\"lotName\":\"").append(escapeJson(s.getLotName())).append("\",")
                .append("\"locationNode\":\"").append(s.getLocationNode()).append("\",")
                .append("\"travelTimeMinutes\":").append(s.getTravelTimeMinutes()).append(",")
                .append("\"distanceKm\":").append(s.getDistanceKm()).append(",")
                .append("\"travelRoute\":\"").append(escapeJson(s.getTravelRoute())).append("\",")
                .append("\"availableSpaces\":").append(s.getAvailableSpaces()).append(",")
                .append("\"sampleSpaceId\":").append(s.getSampleSpaceId() != null ? "\"" + s.getSampleSpaceId() + "\"" : "null")
                .append("}");
        }
        json.append("]");

        json.append("}");

        int statusCode = 200;
        if (!result.isSuccess() && result.getQueuedRequest() == null) {
            statusCode = 409; // HTTP 409 Conflict when requested lot/space is unavailable
        }
        sendJsonResponse(exchange, statusCode, json.toString());
    }

    private static void handleCheckIn(HttpExchange exchange, String reservationId) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> map = parseSimpleJson(body);
        String vehicleId = map.get("vehicleId");

        try {
            Reservation r = controller.checkIn(reservationId, vehicleId);
            sendJsonResponse(exchange, 200, reservationToJson(r));
        } catch (Exception e) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private static void handleCheckOut(HttpExchange exchange, String reservationId) throws IOException {
        try {
            Reservation r = controller.checkOut(reservationId);
            sendJsonResponse(exchange, 200, reservationToJson(r));
        } catch (Exception e) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private static void handleCancelBooking(HttpExchange exchange, String reservationId) throws IOException {
        try {
            Reservation r = controller.cancelReservation(reservationId);
            sendJsonResponse(exchange, 200, reservationToJson(r));
        } catch (Exception e) {
            sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private static void handleProcessExpired(HttpExchange exchange) throws IOException {
        List<Reservation> expired = controller.processExpiredReservations(ParkingOperationsController.DEFAULT_GRACE_PERIOD_MINUTES);
        StringBuilder json = new StringBuilder();
        json.append("{\"success\":true,\"expiredCount\":").append(expired.size()).append(",\"expired\":[");
        for (int i = 0; i < expired.size(); i++) {
            if (i > 0) json.append(",");
            json.append(reservationToJson(expired.get(i)));
        }
        json.append("]}");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetTime(HttpExchange exchange) throws IOException {
        int t = controller.getCurrentSimulatedTime();
        String json = "{\"simulatedTime\":" + t + ",\"simulatedTimeFormatted\":\"" + Reservation.formatTime(t) + "\"}";
        sendJsonResponse(exchange, 200, json);
    }

    private static void handleSetTime(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> map = parseSimpleJson(body);

        if (map.containsKey("minutes")) {
            controller.setSimulatedTime(parseInt(map.get("minutes"), controller.getCurrentSimulatedTime()));
        } else if (map.containsKey("advance")) {
            controller.advanceSimulatedTime(parseInt(map.get("advance"), 0));
        }

        int t = controller.getCurrentSimulatedTime();
        String json = "{\"success\":true,\"simulatedTime\":" + t + ",\"simulatedTimeFormatted\":\"" + Reservation.formatTime(t) + "\"}";
        sendJsonResponse(exchange, 200, json);
    }

    private static void handleGetQueue(HttpExchange exchange) throws IOException {
        List<ParkingRequest> queue = controller.getWaitingRequests();
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < queue.size(); i++) {
            if (i > 0) json.append(",");
            ParkingRequest req = queue.get(i);
            json.append("{")
                .append("\"requestId\":\"").append(req.getRequestId()).append("\",")
                .append("\"vehicleId\":\"").append(req.getVehicle().getVehicleId()).append("\",")
                .append("\"ownerName\":\"").append(escapeJson(req.getVehicle().getOwnerName())).append("\",")
                .append("\"vehicleType\":\"").append(req.getVehicle().getType().name()).append("\",")
                .append("\"requestTime\":").append(req.getRequestTime()).append(",")
                .append("\"requestTimeFormatted\":\"").append(Reservation.formatTime(req.getRequestTime())).append("\",")
                .append("\"startTime\":").append(req.getRequestedStartTime()).append(",")
                .append("\"endTime\":").append(req.getRequestedEndTime()).append(",")
                .append("\"startTimeFormatted\":\"").append(Reservation.formatTime(req.getRequestedStartTime())).append("\",")
                .append("\"endTimeFormatted\":\"").append(Reservation.formatTime(req.getRequestedEndTime())).append("\",")
                .append("\"accessPriority\":").append(req.getAccessPriority()).append(",")
                .append("\"originNode\":\"").append(req.getOriginNode()).append("\",")
                .append("\"status\":\"").append(req.getStatus()).append("\"")
                .append("}");
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetLotSuggestions(HttpExchange exchange, Map<String, String> params) throws IOException {
        String originNode = params.getOrDefault("originNode", "N1");
        String vType = params.getOrDefault("vehicleType", "CAR");
        boolean permit = Boolean.parseBoolean(params.getOrDefault("accessiblePermit", "false"));
        int startTime = parseInt(params.get("startTime"), controller.getCurrentSimulatedTime());
        int endTime = parseInt(params.get("endTime"), startTime + 120);

        VehicleType type = "TWO_WHEELER".equalsIgnoreCase(vType) ? VehicleType.TWO_WHEELER : VehicleType.CAR;
        Vehicle dummy = new Vehicle("TEMP-QUERY", "Driver", type, permit);

        List<ParkingOperationsController.NearbyLotSuggestion> suggestions =
                controller.getNearbyLotSuggestions(originNode, dummy, startTime, endTime);

        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < suggestions.size(); i++) {
            if (i > 0) json.append(",");
            ParkingOperationsController.NearbyLotSuggestion s = suggestions.get(i);
            json.append("{")
                .append("\"lotId\":\"").append(s.getLotId()).append("\",")
                .append("\"lotName\":\"").append(escapeJson(s.getLotName())).append("\",")
                .append("\"locationNode\":\"").append(s.getLocationNode()).append("\",")
                .append("\"travelTimeMinutes\":").append(s.getTravelTimeMinutes()).append(",")
                .append("\"distanceKm\":").append(s.getDistanceKm()).append(",")
                .append("\"travelRoute\":\"").append(escapeJson(s.getTravelRoute())).append("\",")
                .append("\"availableSpaces\":").append(s.getAvailableSpaces()).append(",")
                .append("\"sampleSpaceId\":").append(s.getSampleSpaceId() != null ? "\"" + s.getSampleSpaceId() + "\"" : "null")
                .append("}");
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    private static void handleGetGraphNodes(HttpExchange exchange) throws IOException {
        Map<String, GraphNode> nodes = controller.getRoadNetwork().getAllNodes();
        StringBuilder json = new StringBuilder("[");
        boolean first = true;
        for (GraphNode node : nodes.values()) {
            if (!first) json.append(",");
            json.append("{")
                .append("\"id\":\"").append(node.getId()).append("\",")
                .append("\"name\":\"").append(escapeJson(node.getName())).append("\"")
                .append("}");
            first = false;
        }
        json.append("]");
        sendJsonResponse(exchange, 200, json.toString());
    }

    // =========================================================================
    // STATIC FILE HANDLER (Serves frontend/ directory)
    // =========================================================================

    private static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            File file = new File(frontendDir, path.replace('/', File.separatorChar));
            if (!file.exists() || file.isDirectory()) {
                file = new File(frontendDir, "index.html");
            }

            if (!file.exists()) {
                String response = "404 Not Found";
                exchange.sendResponseHeaders(404, response.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(response.getBytes());
                }
                return;
            }

            String contentType = getMimeType(file.getName());
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, file.length());

            try (InputStream is = new FileInputStream(file); OutputStream os = exchange.getResponseBody()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = is.read(buffer)) > 0) {
                    os.write(buffer, 0, count);
                }
            }
        }

        private String getMimeType(String filename) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=UTF-8";
            if (lower.endsWith(".css")) return "text/css; charset=UTF-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".ico")) return "image/x-icon";
            return "text/plain; charset=UTF-8";
        }
    }

    // =========================================================================
    // JSON SERIALIZERS & HELPERS
    // =========================================================================

    private static String lotToJson(ParkingLot lot) {
        StringBuilder sb = new StringBuilder();
        sb.append("{")
          .append("\"lotId\":\"").append(lot.getLotId()).append("\",")
          .append("\"lotName\":\"").append(escapeJson(lot.getLotName())).append("\",")
          .append("\"locationNode\":\"").append(lot.getLocationNode()).append("\",")
          .append("\"totalSpaces\":").append(lot.countTotalSpaces()).append(",")
          .append("\"availableSpaces\":").append(lot.countAvailableSpaces()).append(",")
          .append("\"reservedSpaces\":").append(lot.countReservedSpaces()).append(",")
          .append("\"occupiedSpaces\":").append(lot.countOccupiedSpaces()).append(",")
          .append("\"spaces\":[");

        for (int i = 0; i < lot.getSpaces().size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(spaceToJson(lot.getSpaces().get(i)));
        }
        sb.append("]}");
        return sb.toString();
    }

    private static String spaceToJson(ParkingSpace space) {
        return "{" +
                "\"spaceId\":\"" + space.getSpaceId() + "\"," +
                "\"lotId\":\"" + space.getLotId() + "\"," +
                "\"spaceType\":\"" + space.getSpaceType() + "\"," +
                "\"status\":\"" + space.getStatus().name() + "\"," +
                "\"isAvailable\":" + space.isAvailable() + "," +
                "\"isReserved\":" + space.isReserved() + "," +
                "\"isOccupied\":" + space.isOccupied() +
                "}";
    }

    private static String vehicleToJson(Vehicle v) {
        return "{" +
                "\"vehicleId\":\"" + v.getVehicleId() + "\"," +
                "\"ownerName\":\"" + escapeJson(v.getOwnerName()) + "\"," +
                "\"vehicleType\":\"" + v.getType().name() + "\"," +
                "\"accessiblePermit\":" + v.hasAccessiblePermit() +
                "}";
    }

    private static String reservationToJson(Reservation r) {
        return "{" +
                "\"reservationId\":\"" + r.getReservationId() + "\"," +
                "\"vehicleId\":\"" + r.getVehicle().getVehicleId() + "\"," +
                "\"ownerName\":\"" + escapeJson(r.getVehicle().getOwnerName()) + "\"," +
                "\"vehicleType\":\"" + r.getVehicle().getType().name() + "\"," +
                "\"accessiblePermit\":" + r.getVehicle().hasAccessiblePermit() + "," +
                "\"spaceId\":\"" + r.getSpace().getSpaceId() + "\"," +
                "\"spaceType\":\"" + r.getSpace().getSpaceType() + "\"," +
                "\"lotId\":\"" + r.getSpace().getLotId() + "\"," +
                "\"startTime\":" + r.getStartTime() + "," +
                "\"endTime\":" + r.getEndTime() + "," +
                "\"startTimeFormatted\":\"" + Reservation.formatTime(r.getStartTime()) + "\"," +
                "\"endTimeFormatted\":\"" + Reservation.formatTime(r.getEndTime()) + "\"," +
                "\"expiryDeadline\":" + r.getExpiryDeadline() + "," +
                "\"expiryDeadlineFormatted\":\"" + Reservation.formatTime(r.getExpiryDeadline()) + "\"," +
                "\"status\":\"" + r.getStatus().name() + "\"," +
                "\"isActive\":" + r.isActiveSlot() + "," +
                "\"createdAt\":" + r.getCreatedAt() + "," +
                "\"createdAtFormatted\":\"" + Reservation.formatTime(r.getCreatedAt()) + "\"" +
                "}";
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String responseJson) throws IOException {
        byte[] bytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String extractMiddlePath(String fullPath, String prefix, String suffix) {
        int start = prefix.length();
        int end = fullPath.length() - suffix.length();
        if (start < end) {
            return fullPath.substring(start, end);
        }
        return "";
    }

    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null || query.isEmpty()) return params;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                params.put(key, value);
            }
        }
        return params;
    }

    private static Map<String, String> parseSimpleJson(String json) {
        Map<String, String> map = new HashMap<>();
        if (json == null || json.trim().isEmpty()) return map;

        String s = json.trim();
        if (s.startsWith("{")) s = s.substring(1);
        if (s.endsWith("}")) s = s.substring(0, s.length() - 1);

        String[] tokens = s.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
        for (String token : tokens) {
            String[] kv = token.split(":(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("^\"|\"$", "");
                String value = kv[1].trim().replaceAll("^\"|\"$", "");
                map.put(key, value);
            }
        }
        return map;
    }

    private static int parseInt(String val, int defaultVal) {
        if (val == null || val.trim().isEmpty()) return defaultVal;
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static double parseDouble(String val, double defaultVal) {
        if (val == null || val.trim().isEmpty()) return defaultVal;
        try {
            return Double.parseDouble(val.trim());
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
