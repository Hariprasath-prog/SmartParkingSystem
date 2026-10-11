/**
 * auth.js — Centralized Authentication & Session Management
 * Idam Nagar Urban Mobility & Smart Parking Authority
 *
 * Provides authentication services for admin-login.html and user-login.html
 * without requiring any modifications to the backend server.
 */

const Auth = (() => {
    const STORAGE_KEY_SESSION = 'in_spa_active_session';
    const STORAGE_KEY_USERS = 'in_spa_registered_users';

    // Seeded Administrator Accounts
    const ADMIN_ACCOUNTS = [
        {
            username: 'admin',
            password: 'admin123',
            name: 'Chief Mobility Controller',
            role: 'admin',
            badge: 'COMMAND CENTER'
        },
        {
            username: 'supervisor',
            password: 'transit2026',
            name: 'Operations Supervisor',
            role: 'admin',
            badge: 'DISPATCH SUPERVISOR'
        }
    ];

    // Seeded Driver / Citizen Accounts (Matching SampleData Fleet)
    const SEEDED_USER_ACCOUNTS = [
        {
            username: 'johndoe',
            password: 'user123',
            name: 'John Doe',
            vehicleId: 'KA-01-AB-1234',
            vehicleType: 'CAR',
            accessiblePermit: false,
            role: 'user'
        },
        {
            username: 'priyasharma',
            password: 'user123',
            name: 'Priya Sharma',
            vehicleId: 'KA-02-CD-5678',
            vehicleType: 'CAR',
            accessiblePermit: true,
            role: 'user'
        },
        {
            username: 'arunkumar',
            password: 'user123',
            name: 'Arun Kumar',
            vehicleId: 'KA-03-EF-9012',
            vehicleType: 'TWO_WHEELER',
            accessiblePermit: false,
            role: 'user'
        }
    ];

    // Initialize registered users in localStorage if not yet present
    function getRegisteredUsers() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USERS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEEDED_USER_ACCOUNTS));
                return SEEDED_USER_ACCOUNTS;
            }
            return JSON.parse(raw);
        } catch (e) {
            return SEEDED_USER_ACCOUNTS;
        }
    }

    function saveRegisteredUsers(users) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATION LOGIC
    // -------------------------------------------------------------------------

    function loginAdmin(username, password) {
        const cleanUser = (username || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();

        if (!cleanUser || !cleanPass) {
            return { success: false, message: 'Please enter both username and password.' };
        }

        const match = ADMIN_ACCOUNTS.find(a => a.username.toLowerCase() === cleanUser);
        if (!match || match.password !== cleanPass) {
            return {
                success: false,
                message: 'Invalid administrative credentials. Access denied.'
            };
        }

        const session = {
            username: match.username,
            name: match.name,
            role: 'admin',
            badge: match.badge,
            loginTime: Date.now()
        };

        setSession(session, true);
        return { success: true, user: session, redirect: 'index.html#admin' };
    }

    function loginUser(username, password) {
        const cleanUser = (username || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();

        if (!cleanUser || !cleanPass) {
            return { success: false, message: 'Please enter both username and password.' };
        }

        const allUsers = getRegisteredUsers();
        const match = allUsers.find(u => u.username.toLowerCase() === cleanUser);

        if (!match || match.password !== cleanPass) {
            return {
                success: false,
                message: 'Invalid username or password. Please verify and try again.'
            };
        }

        const session = {
            username: match.username,
            name: match.name,
            role: 'user',
            vehicleId: match.vehicleId || 'KA-01-AB-1234',
            vehicleType: match.vehicleType || 'CAR',
            accessiblePermit: !!match.accessiblePermit,
            loginTime: Date.now()
        };

        setSession(session, true);
        return { success: true, user: session, redirect: 'index.html#find-parking' };
    }

    function registerUser(data) {
        const username = (data.username || '').trim().toLowerCase();
        const password = (data.password || '').trim();
        const name = (data.name || '').trim();
        const vehicleId = (data.vehicleId || '').trim().toUpperCase();
        const vehicleType = data.vehicleType || 'CAR';
        const accessiblePermit = !!data.accessiblePermit;

        if (!username || username.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters long.' };
        }
        if (!password || password.length < 4) {
            return { success: false, message: 'Password must be at least 4 characters long.' };
        }
        if (!name) {
            return { success: false, message: 'Please enter your full name.' };
        }
        if (!vehicleId) {
            return { success: false, message: 'Please enter your vehicle license plate.' };
        }

        const allUsers = getRegisteredUsers();
        const exists = allUsers.some(u => u.username.toLowerCase() === username);
        if (exists) {
            return { success: false, message: 'This username is already taken. Please choose another.' };
        }

        const newUser = {
            username,
            password,
            name,
            vehicleId,
            vehicleType,
            accessiblePermit,
            role: 'user'
        };

        allUsers.push(newUser);
        saveRegisteredUsers(allUsers);

        return {
            success: true,
            message: 'Registration successful! You may now sign in.',
            user: newUser
        };
    }

    // -------------------------------------------------------------------------
    // SESSION MANAGEMENT
    // -------------------------------------------------------------------------

    function setSession(session, remember = true) {
        const json = JSON.stringify(session);
        localStorage.setItem(STORAGE_KEY_SESSION, json);
        sessionStorage.setItem(STORAGE_KEY_SESSION, json);
    }

    function getSession() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
    }

    function logout() {
        const session = getSession();
        const role = session ? session.role : 'user';
        clearSession();
        if (role === 'admin') {
            window.location.href = 'admin-login.html';
        } else {
            window.location.href = 'user-login.html';
        }
    }

    function isAuthenticated() {
        return !!getSession();
    }

    function isAdmin() {
        const session = getSession();
        return !!session && session.role === 'admin';
    }

    function isUser() {
        const session = getSession();
        return !!session && session.role === 'user';
    }

    // -------------------------------------------------------------------------
    // PORTAL INTEGRATION (FOR index.html)
    // -------------------------------------------------------------------------

    function setupPortalAuth() {
        const session = getSession();
        
        // If not authenticated, redirect to user-login.html
        if (!session) {
            // Check if current hash indicates admin page
            if (window.location.hash === '#admin') {
                window.location.href = 'admin-login.html';
            } else {
                window.location.href = 'user-login.html';
            }
            return;
        }

        // Apply role restrictions
        applyRoleRestrictions(session);

        // Inject User Profile & Logout Widget into Top Header
        injectHeaderWidget(session);

        // If user is a driver, auto-populate vehicle info in Find Parking
        setupFormAutoPopulation(session);
    }

    function applyRoleRestrictions(session) {
        const dashboardNavItem = document.querySelector('.nav-item[data-page="dashboard"]');
        const findParkingNavItem = document.querySelector('.nav-item[data-page="find-parking"]');
        const parkingLayoutNavItem = document.querySelector('.nav-item[data-page="parking-layout"]');
        const bookingsNavItem = document.querySelector('.nav-item[data-page="bookings"]');
        const adminNavItem = document.querySelector('.nav-item[data-page="admin"]');
        const driverSectionLabel = document.getElementById('driver-nav-section-label') || document.querySelector('.sidebar-nav .nav-section-label:first-of-type');
        const adminSectionLabel = document.getElementById('admin-nav-section-label') || document.querySelector('.sidebar-nav .nav-section-label:last-of-type');
        const bookingsLabel = document.getElementById('nav-bookings-label');
        const quickBookBtn = document.getElementById('quick-book-btn');

        if (session.role === 'admin') {
            // ============================================================
            // ADMINISTRATOR VIEW:
            // Admin manages municipal transit facility, bays, and bookings:
            // - Show Live Dashboard, Parking Bay Grid, Bookings, Transit Management
            // - Menu item label: 'Bookings' (linked to all municipal bookings)
            // - Hide Find & Book Parking (citizen-only)
            // - Hide Quick Book header button
            // ============================================================
            if (findParkingNavItem) findParkingNavItem.style.display = 'none';
            if (quickBookBtn) quickBookBtn.style.display = 'none';

            if (dashboardNavItem) dashboardNavItem.style.display = 'flex';
            if (parkingLayoutNavItem) parkingLayoutNavItem.style.display = 'flex';
            if (bookingsNavItem) {
                bookingsNavItem.style.display = 'flex';
                if (bookingsLabel) bookingsLabel.textContent = 'Bookings';
            }
            if (adminNavItem) adminNavItem.style.display = 'flex';

            if (driverSectionLabel) {
                driverSectionLabel.style.display = 'block';
                driverSectionLabel.textContent = 'Facility & Telemetry';
            }
            if (adminSectionLabel) {
                adminSectionLabel.style.display = 'block';
                adminSectionLabel.style.marginTop = '1rem';
                adminSectionLabel.textContent = 'Control & Governance';
            }

            // Redirect admin away from citizen booking search if currently active
            const currentHash = window.location.hash;
            if (!currentHash || currentHash === '#' || currentHash === '#find-parking') {
                window.location.hash = '#dashboard';
            }
        } else {
            // ============================================================
            // CITIZEN / DRIVER VIEW:
            // Drivers only book and manage their own reservations:
            // - Hide Live Dashboard and Transit Management
            // - Show Find & Book Parking, Parking Bay Grid, My Bookings
            // - Menu item label: 'My Bookings'
            // - Show Quick Book header button
            // ============================================================
            if (dashboardNavItem) dashboardNavItem.style.display = 'none';
            if (adminNavItem) adminNavItem.style.display = 'none';
            if (adminSectionLabel) adminSectionLabel.style.display = 'none';

            if (findParkingNavItem) findParkingNavItem.style.display = 'flex';
            if (parkingLayoutNavItem) parkingLayoutNavItem.style.display = 'flex';
            if (bookingsNavItem) {
                bookingsNavItem.style.display = 'flex';
                if (bookingsLabel) bookingsLabel.textContent = 'My Bookings';
            }
            if (driverSectionLabel) {
                driverSectionLabel.style.display = 'block';
                driverSectionLabel.textContent = 'Driver Services';
            }
            if (quickBookBtn) quickBookBtn.style.display = 'inline-flex';

            // Bounce citizen away from administrative panels
            const currentHash = window.location.hash;
            if (!currentHash || currentHash === '#' || currentHash === '#dashboard' || currentHash === '#admin') {
                window.location.hash = '#find-parking';
            }
        }
    }

    function injectHeaderWidget(session) {
        const headerActions = document.querySelector('.top-header .header-actions');
        if (!headerActions) return;

        // Check if existing widget already injected
        if (document.getElementById('in-spa-user-profile-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'in-spa-user-profile-widget';
        widget.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.65rem;
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.09);
            padding: 0.35rem 0.65rem;
            border-radius: 9px;
            font-size: 0.8rem;
        `;

        const isAdminRole = session.role === 'admin';
        const roleColor = isAdminRole ? '#38bdf8' : '#34d399';
        const roleBg = isAdminRole ? 'rgba(2, 132, 199, 0.15)' : 'rgba(16, 185, 129, 0.15)';
        const roleLabel = isAdminRole ? 'ADMIN' : (session.vehicleId || 'DRIVER');

        widget.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem">
                <div style="
                    width: 28px;
                    height: 28px;
                    border-radius: 7px;
                    background: ${roleBg};
                    border: 1px solid ${roleColor};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${roleColor};
                    font-weight: 800;
                    font-size: 0.72rem;
                ">
                    ${isAdminRole ? 'ADM' : 'DRV'}
                </div>
                <div style="line-height: 1.2">
                    <div style="font-weight: 700; color: #f8fafc; font-size: 0.82rem; white-space: nowrap">
                        ${escapeHtml(session.name || session.username)}
                    </div>
                    <div style="font-family: var(--font-mono, monospace); font-size: 0.68rem; color: ${roleColor}; font-weight: 600">
                        ${roleLabel}
                    </div>
                </div>
            </div>
            <button id="in-spa-logout-btn" title="Sign out of system" style="
                background: rgba(239, 68, 68, 0.12);
                border: 1px solid rgba(239, 68, 68, 0.25);
                color: #fca5a5;
                border-radius: 6px;
                padding: 0.35rem 0.6rem;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.3rem;
                transition: all 0.2s;
            ">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
            </button>
        `;

        // Prepend before the quick book button or actions
        headerActions.insertBefore(widget, headerActions.firstChild);

        // Attach Logout Event
        const logoutBtn = document.getElementById('in-spa-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logout();
            });
        }
    }

    function setupFormAutoPopulation(session) {
        if (!session || session.role !== 'user') return;

        // MutationObserver to pre-populate Find Parking inputs whenever rendered
        const observer = new MutationObserver(() => {
            const vehicleInput = document.getElementById('fp-vehicle-id');
            const ownerInput = document.getElementById('fp-owner-name');
            const typeInput = document.getElementById('fp-vehicle-type');
            const accessibleInput = document.getElementById('fp-accessible');

            if (vehicleInput && !vehicleInput.dataset.prefilled) {
                if (session.vehicleId) vehicleInput.value = session.vehicleId;
                if (session.name) ownerInput.value = session.name;
                if (session.vehicleType && typeInput) typeInput.value = session.vehicleType;
                if (accessibleInput) accessibleInput.checked = !!session.accessiblePermit;

                vehicleInput.dataset.prefilled = 'true';
            }
        });

        const target = document.getElementById('find-parking-content');
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        loginAdmin,
        loginUser,
        registerUser,
        getSession,
        setSession,
        clearSession,
        logout,
        isAuthenticated,
        isAdmin,
        isUser,
        setupPortalAuth,
        getRegisteredUsers
    };
})();
