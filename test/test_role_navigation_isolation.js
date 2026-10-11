/**
 * test_role_navigation_isolation.js
 *
 * Verifies that:
 * 1. For Admin:
 *    - Sees Live Dashboard, Parking Bay Grid, Bookings (labeled "Bookings"), and Transit Management.
 *    - "Find & Book Parking" and "Quick Book Space" button are hidden.
 *    - In Live Dashboard, Quick Operations has "Manage All Bookings" linking to navigateTo('bookings').
 * 2. For Driver/Citizen:
 *    - Sees Find & Book Parking, Parking Bay Grid, and My Bookings (labeled "My Bookings").
 *    - Live Dashboard and Transit Management are completely hidden.
 */

const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log(' RUNNING ROLE NAVIGATION ISOLATION TEST               ');
console.log('======================================================\n');

// Read files
const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
const authJs = fs.readFileSync(path.join(__dirname, '../frontend/js/auth.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../frontend/js/app.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../frontend/js/dashboard.js'), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passed++;
    } else {
        console.error(`[FAIL] ${message}`);
        failed++;
    }
}

// 1. Verify index.html contains correct navigation items and section labels
assert(indexHtml.includes('id="driver-nav-section-label"'), 'driver-nav-section-label element exists in index.html');
assert(indexHtml.includes('id="admin-nav-section-label"'), 'admin-nav-section-label element exists in index.html');
assert(indexHtml.includes('id="nav-bookings-label"'), 'nav-bookings-label element exists in index.html');
assert(indexHtml.includes('data-page="dashboard"'), 'dashboard navigation item exists in index.html');
assert(indexHtml.includes('data-page="find-parking"'), 'find-parking navigation item exists in index.html');
assert(indexHtml.includes('data-page="parking-layout"'), 'parking-layout navigation item exists in index.html');
assert(indexHtml.includes('data-page="bookings"'), 'bookings navigation item exists in index.html');
assert(indexHtml.includes('data-page="admin"'), 'admin navigation item exists in index.html');

// 2. Verify auth.js applyRoleRestrictions configures Admin navigation
assert(authJs.includes("if (session.role === 'admin')"), "auth.js checks session.role === 'admin'");
assert(authJs.includes("findParkingNavItem.style.display = 'none'"), "auth.js hides find-parking nav item for admin");
assert(authJs.includes("quickBookBtn.style.display = 'none'"), "auth.js hides quick-book-btn for admin");
assert(authJs.includes("dashboardNavItem.style.display = 'flex'"), "auth.js displays dashboard nav item for admin");
assert(authJs.includes("parkingLayoutNavItem.style.display = 'flex'"), "auth.js displays parking-layout (Parking Bay Grid) for admin");
assert(authJs.includes("bookingsNavItem.style.display = 'flex'"), "auth.js displays bookings nav item for admin");
assert(authJs.includes("bookingsLabel.textContent = 'Bookings'"), "auth.js sets Bookings menu label to 'Bookings' for admin");
assert(authJs.includes("adminNavItem.style.display = 'flex'"), "auth.js displays admin nav item for admin");

// 3. Verify auth.js applyRoleRestrictions configures Citizen navigation
assert(authJs.includes("dashboardNavItem.style.display = 'none'"), "auth.js hides dashboard nav item for citizens");
assert(authJs.includes("adminNavItem.style.display = 'none'"), "auth.js hides admin nav item for citizens");
assert(authJs.includes("findParkingNavItem.style.display = 'flex'"), "auth.js displays find-parking for citizens");
assert(authJs.includes("parkingLayoutNavItem.style.display = 'flex'"), "auth.js displays parking-layout for citizens");
assert(authJs.includes("bookingsNavItem.style.display = 'flex'"), "auth.js displays bookings for citizens");
assert(authJs.includes("bookingsLabel.textContent = 'My Bookings'"), "auth.js sets Bookings menu label to 'My Bookings' for citizens");

// 4. Verify app.js navigateTo guards and breadcrumbs
assert(appJs.includes("pageName === 'find-parking' && typeof Auth !== 'undefined' && Auth.isAdmin()"), "app.js guards prevent admin navigation to citizen find-parking form");
assert(appJs.includes("pageName = 'dashboard'"), "app.js redirects admin to dashboard if accessing booking search form");
assert(appJs.includes("title: isAdmin ? 'Bookings' : 'My Bookings'"), "app.js sets breadcrumb to 'Bookings' for admin");

// 5. Verify Live Dashboard Quick Operations links Manage All Bookings to Bookings menu
assert(dashboardJs.includes("onclick=\"navigateTo('bookings')\""), "dashboard.js Quick Operations links to Bookings menu via navigateTo('bookings')");
assert(dashboardJs.includes("Manage All Bookings"), "dashboard.js Quick Operations has Manage All Bookings button");

console.log(`\n======================================================`);
console.log(` ROLE ISOLATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log(`======================================================`);

if (failed > 0) process.exit(1);
