# Idam Nagar Smart Parking Authority — Backend & Frontend Platform Guide

**Idam Nagar Urban Mobility & Smart Parking Authority (IN-SPA)** is an enterprise-grade municipal parking management system implemented in pure Java using Object-Oriented Programming (OOP) and Data Structures & Algorithms (DSA), coupled with a professional, high-contrast web management portal.

---

## Architecture Overview

```
SmartParkingSystem/
├── src/                                  # Core Java Backend (OOP & DSA)
│   ├── graph/
│   │   ├── DijkstraAlgorithm.java        # Dijkstra Shortest Path algorithm with Min-Heap
│   │   ├── Edge.java                     # Weighted road network edge (travel time in mins)
│   │   ├── GraphNode.java                # Intersection / gateway / facility vertex
│   │   └── WeightedGraph.java            # Adjacency-list road network graph (9 urban nodes)
│   ├── model/
│   │   ├── AccessibleSpace.java          # Dedicated mobility bays (permits only)
│   │   ├── CarSpace.java                 # Standard passenger vehicle stalls
│   │   ├── TwoWheelerSpace.java          # Motorcycle / scooter bays
│   │   ├── ParkingSpace.java             # Abstract polymorphic base stall class
│   │   ├── ParkingLot.java               # LOT-A / LOT-B / LOT-C (20 bays each = 60 bays total)
│   │   ├── ParkingRequest.java           # Comparable queue entry (min-heap priority ranking)
│   │   ├── Reservation.java              # 20-min arrival hold, interval conflicts, overstay tracking
│   │   ├── ReservationStatus.java        # RESERVED | CHECKED_IN | OVERSTAY | COMPLETED | CANCELLED | EXPIRED
│   │   ├── SpaceStatus.java              # AVAILABLE | RESERVED | OCCUPIED
│   │   ├── Vehicle.java                  # Vehicle entity with classification & permit attributes
│   │   └── VehicleType.java              # CAR | TWO_WHEELER
│   ├── service/
│   │   ├── DefaultSlotSelectionPolicy.java # Slot selection logic
│   │   ├── ParkingOperationsController.java # Central thread-safe orchestrator & allocation engine
│   │   ├── ReservationManager.java       # Interval conflict detection, 20-min expiry, overstay checks
│   │   └── SlotSelectionPolicy.java
│   ├── server/
│   │   └── SmartParkingServer.java       # Built-in zero-dependency HTTP REST & Static File Server
│   ├── util/
│   │   ├── SampleData.java               # 3 lots (60 bays), 9 nodes, test fleet, 20 synthetic events
│   │   └── SystemTestSuite.java          # Automated test runner for 14 critical test requirements
│   └── main/
│       └── Main.java                     # Console interactive role selector & event runner
│
├── frontend/                             # Professional Urban Mobility Web Interface
│   ├── index.html                        # Application shell & semantic page layouts
│   ├── css/
│   │   ├── styles.css                    # Design system (Plus Jakarta Sans, JetBrains Mono, transit tokens)
│   │   └── responsive.css                # Mobile & tablet viewports
│   └── js/
│       ├── api.js                        # Centralized Fetch API client with 409 conflict handling
│       ├── app.js                        # Navigation, toasts, status badges, SVG icons
│       ├── dashboard.js                  # Live capacity metrics, occupancy bars, recent audit log
│       ├── parking.js                    # Find Parking (Date/Time, Preferences, 20-min timer, Alternatives)
│       ├── bookings.js                   # Booking ledger with filters, gate check-in, overstay alerts
│       ├── admin.js                      # Network clock advance, queue inspection, fleet monitoring
│       └── validation.js                 # Inline client-side form validation
│
└── README.md                             # System guide & testing documentation
```

---

## 1. Quick Start: Zero-Dependency Pure Java Server

The application contains a built-in zero-dependency web and REST server using Java's standard library `com.sun.net.httpserver.HttpServer`. No Maven or external framework installation is required.

### Compile Java Classes
```powershell
javac -d bin (Get-ChildItem -Path src -Recurse -Filter *.java | ForEach-Object { $_.FullName })
```

### Start Web Server & REST API
```powershell
java -cp bin server.SmartParkingServer
```

Once started:
- **Web Interface:** Open **[http://localhost:8080](http://localhost:8080)** in any modern browser.
- **REST API:** Available at `http://localhost:8080/api`.
- **Live Operations Dashboard:** `http://localhost:8080/api/dashboard`.
- **Automatic Background Scheduler:** The server automatically runs a 3-second background polling daemon that processes expired reservations past their 20-minute window and flags vehicle overstays.

---

## 2. Automated Test Suite (14 Critical Test Scenarios)

To execute the automated regression test suite covering all 14 project requirements:

```powershell
java -cp bin util.SystemTestSuite
```

### Verified Test Cases
| Test ID | Scenario Description | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **TEST 01** | 20-Minute Expiry Deadline Recording | Reservation created at 10:00 AM records expiry deadline of 10:20 AM | **PASS** |
| **TEST 02** | Pre-Deadline Check-In Confirmation | Arriving before 10:20 AM transitions state to `CHECKED_IN` and prevents expiration | **PASS** |
| **TEST 03** | 20-Minute Unconfirmed Expiry | Unconfirmed reservation expires after 20 mins and safely frees the stall | **PASS** |
| **TEST 04** | Overstay Detection | Vehicle parked past end time flags `OVERSTAY` and maintains stall `OCCUPIED` | **PASS** |
| **TEST 05** | Interval Conflict Detection | Overlapping booking attempts (`start < exp_end && end > exp_start`) are rejected | **PASS** |
| **TEST 06** | Nearest Slot Dijkstra Routing | Shortest travel route evaluated from driver's origin node to candidate lots | **PASS** |
| **TEST 07** | Preferred Area Saturation Fallback | Preferred facility full -> recommends nearest available alternative facility | **PASS** |
| **TEST 08 & 13** | Concurrency Safety & 409 Conflict | Concurrent bookings synchronized; conflicts return HTTP 409 with alternatives | **PASS** |
| **TEST 09** | 20 Slots per Parking Area | LOT-A (20), LOT-B (20), LOT-C (20) initialized (Total 60 spaces across 3 sectors) | **PASS** |
| **TEST 10** | Date/Time Validation Rejection | Requests with `endTime <= startTime` are rejected with validation error | **PASS** |

---

## 3. Key Feature Specifications

### 20-Minute Reservation Arrival Timeout Rule
1. When a reservation is created, the server records `createdAt` and persists `expiryDeadline = Math.max(createdAt, startTime) + 20`.
2. The user has an active 20-minute arrival window to reach the facility entrance and verify gate check-in.
3. If confirmed before the deadline, the reservation becomes `CHECKED_IN` and the stall transitions to `OCCUPIED`.
4. If unconfirmed after 20 minutes, the background Java scheduler transitions the reservation to `EXPIRED` and frees the physical hold so waiting drivers can book.
5. Once a driver has checked in, the stall is tracked as an active session. If the driver remains past the requested end time, the system transitions to `OVERSTAY` and **does NOT release the stall** until the driver physically checks out.

### Find & Book Parking Module
- **From Date & Time Inputs:** User-editable date and time inputs defaulting to current date and simulated clock time.
- **Until Date & Time Inputs:** User-editable date and time inputs defaulting to 1 or 2 hours after start.
- **Preferences:** Preferred parking facility selection (`LOT-A`, `LOT-B`, `LOT-C`, or `Auto Nearest`) and maximum acceptable transit distance.
- **Alternative Recommendations (Section 7):** When a preferred lot or slot is unavailable or a booking conflict occurs (HTTP 409 Conflict), the UI displays **Recommended Alternative Parking** with Dijkstra travel time in minutes, distance in km, transit route, and a 1-click **Book This Slot** action.

### Parking Area Capacity (60 Bays Total)
Each of the 3 facilities contains 20 dedicated stalls organized into three functional sectors:
- **Sector 1 (12 Bays):** Standard Passenger Car Stalls (`A-C01` through `A-C12`, `B-C01` through `B-C12`, `C-C01` through `C-C12`)
- **Sector 2 (6 Bays):** Two-Wheeler / Motorcycle Stalls (`A-T01` through `A-T06`, `B-T01` through `B-T06`, `C-T01` through `C-T06`)
- **Sector 3 (2 Bays):** Priority Accessible Disability Stalls (`A-ACC1` & `A-ACC2`, `B-ACC1` & `B-ACC2`, `C-ACC1` & `C-ACC2`)

---

## 4. REST API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Live operational capacity metrics, occupancy rates, lot statuses, and recent bookings |
| `GET` | `/api/lots` | List all parking facilities with live bay counts |
| `GET` | `/api/spaces` | Query bays with optional filters (`lotId`, `status`, `type`) |
| `GET` | `/api/reservations` | Retrieve all reservations or filter by `vehicleId` / `status` |
| `POST` | `/api/bookings` | Create new reservation with Dijkstra routing, interval conflict checking, and alternatives |
| `POST` | `/api/bookings/:id/checkin` | Verify gate arrival check-in (`RESERVED` -> `CHECKED_IN`) |
| `POST` | `/api/bookings/:id/checkout` | Record exit departure (`CHECKED_IN` / `OVERSTAY` -> `COMPLETED`, frees stall) |
| `POST` | `/api/bookings/:id/cancel` | Cancel active reservation and release stall hold |
| `GET` | `/api/lots/suggestions` | Dijkstra nearby alternative facility recommendations |
| `GET` | `/api/admin/time` | Inspect simulated network clock |
| `PUT` | `/api/admin/time` | Advance or set exact simulated clock |
| `POST` | `/api/admin/process-expired` | Manually trigger 20-minute expiry evaluation |
| `GET` | `/api/graph/nodes` | List road network graph vertices |
