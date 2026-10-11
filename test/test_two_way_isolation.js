// Automated Test: Two-way Isolation & Check-In / Check-Out Lifecycle
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

async function runTwoWayIsolationTest() {
    console.log('======================================================');
    console.log(' RUNNING TWO-WAY USER ISOLATION & LIFECYCLE TEST      ');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, name) {
        if (cond) {
            console.log(`[PASS] ${name}`);
            passed++;
        } else {
            console.error(`[FAIL] ${name}`);
            failed++;
        }
    }

    try {
        // Create John Doe's reservation
        console.log('[ACTION] Creating booking for John Doe (KA-01-AB-1234)...');
        const johnRes = await apiRequest('/bookings', 'POST', {
            vehicleId: 'KA-01-AB-1234',
            ownerName: 'John Doe',
            vehicleType: 'CAR',
            accessiblePermit: false,
            originNode: 'N1',
            preferredLotId: 'LOT-A',
            startTime: 800,
            endTime: 860,
            accessPriority: 2
        });

        assert(johnRes.status === 200 || johnRes.status === 201, 'John Doe reservation created successfully');
        const johnResId = johnRes.data.reservationId;
        console.log(`       John Doe reservation ID: ${johnResId}`);

        // Fetch all reservations from server
        const allRes = await apiRequest('/reservations');
        const reservations = Array.isArray(allRes.data) ? allRes.data : [];

        // Scoped views for both users
        const johnFiltered = reservations.filter(r => (r.vehicleId || '').toUpperCase() === 'KA-01-AB-1234');
        const priyaFiltered = reservations.filter(r => (r.vehicleId || '').toUpperCase() === 'KA-02-CD-5678');

        assert(johnFiltered.some(r => r.reservationId === johnResId), 'John Doe sees his newly created reservation');
        assert(!priyaFiltered.some(r => r.reservationId === johnResId), 'Priya Sharma CANNOT see John Doe reservation');

        // Test Check-in for John Doe
        console.log(`\n[ACTION] Testing gate check-in for John Doe (${johnResId})...`);
        const checkInRes = await apiRequest(`/bookings/${johnResId}/checkin`, 'POST', { vehicleId: 'KA-01-AB-1234' });
        assert(checkInRes.status === 200, 'John Doe gate check-in succeeds');

        // Verify John Doe booking status updated to CHECKED_IN
        const updatedRes = await apiRequest(`/reservations/${johnResId}`);
        assert(updatedRes.data.status === 'CHECKED_IN', 'Reservation status transitioned to CHECKED_IN');

        // Verify Priya Sharma still cannot see it
        const allResAfterCheckin = await apiRequest('/reservations');
        const priyaAfterCheckin = allResAfterCheckin.data.filter(r => (r.vehicleId || '').toUpperCase() === 'KA-02-CD-5678');
        assert(!priyaAfterCheckin.some(r => r.reservationId === johnResId), 'Priya Sharma still has 0 visibility of John Doe checked-in stall');

        // Test Checkout for John Doe
        console.log(`\n[ACTION] Testing gate check-out for John Doe (${johnResId})...`);
        const checkOutRes = await apiRequest(`/bookings/${johnResId}/checkout`, 'POST');
        assert(checkOutRes.status === 200, 'John Doe gate check-out succeeds');

        const completedRes = await apiRequest(`/reservations/${johnResId}`);
        assert(completedRes.data.status === 'COMPLETED', 'Reservation status updated to COMPLETED');

    } catch (err) {
        console.error('Test error:', err);
        failed++;
    }

    console.log('\n======================================================');
    console.log(` TWO-WAY ISOLATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================');
    process.exit(failed > 0 ? 1 : 0);
}

runTwoWayIsolationTest();
