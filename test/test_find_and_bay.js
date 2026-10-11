// Test: Find Booking & Parking Bay Grid API & Logic End-to-End
const http = require('http');

function apiRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runFindAndBayTest() {
    console.log('======================================================');
    console.log(' RUNNING FIND BOOKING & PARKING BAY INTEGRATION TEST  ');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`[PASS] ${msg}`);
            passed++;
        } else {
            console.error(`[FAIL] ${msg}`);
            failed++;
        }
    }

    try {
        // 1. Road Network Nodes for Find Parking
        const nodesRes = await apiRequest('/graph/nodes');
        assert(nodesRes.status === 200 && Array.isArray(nodesRes.data) && nodesRes.data.length === 9,
            'Road network nodes (N1-N9) loaded for Find Parking form dropdown');

        // 2. Parking Lots for Bay Grid
        const lotsRes = await apiRequest('/lots');
        assert(lotsRes.status === 200 && Array.isArray(lotsRes.data) && lotsRes.data.length === 3,
            'Parking lots loaded for Bay Grid (LOT-A, LOT-B, LOT-C)');

        // 3. Stalls / Spaces for Bay Grid
        const spacesRes = await apiRequest('/spaces');
        assert(spacesRes.status === 200 && Array.isArray(spacesRes.data) && spacesRes.data.length === 60,
            'Parking spaces loaded for Bay Grid (All 60 bays present across 3 facilities)');

        // 4. Dijkstra suggestions
        const suggRes = await apiRequest('/lots/suggestions?originNode=N1&vehicleType=CAR');
        assert(suggRes.status === 200 && Array.isArray(suggRes.data) && suggRes.data.length > 0,
            'Dijkstra shortest-path lot suggestions return valid routes from N1');

        // 5. Booking allocation (Find Parking Submit)
        const bookPayload = {
            vehicleId: 'KA-01-AB-1234',
            ownerName: 'John Doe',
            vehicleType: 'CAR',
            accessiblePermit: false,
            originNode: 'N1',
            preferredLotId: 'LOT-A',
            startTime: 900, // 15:00
            endTime: 960,   // 16:00
            accessPriority: 2
        };

        const bookRes = await apiRequest('/bookings', 'POST', bookPayload);
        assert(bookRes.status === 200 || bookRes.status === 201,
            'Find Parking form booking submission allocates a parking bay successfully');
        if (bookRes.data && bookRes.data.reservationId) {
            console.log(`       Allocated Bay: ${bookRes.data.spaceId} in ${bookRes.data.lotName} (Reservation: ${bookRes.data.reservationId})`);
        }

        // 6. Stall details modal verification
        const firstSpaceId = spacesRes.data[0].spaceId;
        const spaceDetailRes = await apiRequest(`/spaces/${firstSpaceId}`);
        assert(spaceDetailRes.status === 200 && spaceDetailRes.data.spaceId === firstSpaceId,
            `Technical stall profile loads successfully for bay ${firstSpaceId}`);

    } catch (e) {
        console.error('Test error:', e);
        failed++;
    }

    console.log('\n======================================================');
    console.log(` FIND & BAY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================');
    process.exit(failed > 0 ? 1 : 0);
}

runFindAndBayTest();
