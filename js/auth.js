/**
 * BU Resource Hub - Authentication & Telemetry Module
 */

(function () {
    // 1. Auth Guard (Session Storage)
    const ssUser = sessionStorage.getItem('ss_user');
    if (!ssUser) {
        window.location.href = '/login';
        return;
    }

    let currentUser = null;
    try {
        currentUser = JSON.parse(ssUser);
    } catch (e) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
    }

    window.currentUser = currentUser;

    // 2. Populate User Profile in Navbar
    function updateUserNavbar() {
        if (!currentUser) return;
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) {
            userProfile.classList.remove('hidden');
            userProfile.classList.add('flex');
        }

        const displayName = (currentUser.name || currentUser.full_name || currentUser.email?.split('@')[0] || 'User').trim();

        if (userName) {
            userName.innerText = displayName;
        }

        if (userAvatar) {
            // Generates initials like "VM" for "Vansh Malhotra", "SD" for "Samman Dev", etc.
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&bold=true&size=128`;
            userAvatar.alt = displayName;
            userAvatar.title = displayName;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateUserNavbar);
    } else {
        updateUserNavbar();
    }

    // 3. Sign Out Function
    window.signOut = async function () {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + (sessionStorage.getItem('ss_token') || '') }
            });
        } catch (e) { /* non-blocking */ }

        sessionStorage.removeItem('ss_user');
        sessionStorage.removeItem('ss_token');
        window.location.href = '/login';
    };

    // 4. Feature Tracking Telemetry
    const _trackSent = new Map();
    const _TRACK_COOLDOWN = 5000; // 5s cooldown per unique event

    window.trackFeatureUsage = async function (featureName, action) {
        if (!currentUser || !currentUser.id) return;
        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)) return;

        const key = currentUser.id + ':' + featureName + ':' + action;
        const now = Date.now();
        if (_trackSent.has(key) && now - _trackSent.get(key) < _TRACK_COOLDOWN) return;
        _trackSent.set(key, now);

        try {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    feature_name: featureName,
                    action: action
                }),
                keepalive: true
            }).catch(() => {});
        } catch (err) { /* non-critical */ }
    };

    // 5. Global Telemetry Event Delegation
    document.addEventListener('click', (e) => {
        if (e.target.closest('.sem-tab')) {
            trackFeatureUsage('Semester Tab', 'Viewed ' + e.target.closest('.sem-tab').textContent.trim());
        } else if (e.target.closest('.pomo-btn-start')) {
            trackFeatureUsage('Pomodoro Timer', 'Started Timer');
        } else if (e.target.closest('.pomo-btn-reset')) {
            trackFeatureUsage('Pomodoro Timer', 'Reset Timer');
        } else if (e.target.closest('.add-note-btn')) {
            trackFeatureUsage('Sticky Notes', 'Added New Note');
        } else if (e.target.closest('.sticky-note-del')) {
            trackFeatureUsage('Sticky Notes', 'Deleted Note');
        } else if (e.target.closest('[onclick*="toggleModal(\'cgpaModal\')"]') || e.target.closest('[onclick*="toggleModal(\\\'cgpaModal\\\')"]')) {
            trackFeatureUsage('CGPA Calculator', 'Opened Modal');
        } else if (e.target.closest('.bm-btn')) {
            trackFeatureUsage('Bookmarks', 'Toggled Bookmark on Resource');
        } else if (e.target.id === 'searchInput') {
            trackFeatureUsage('Search', 'Focused Search Bar');
        }
    });
})();

