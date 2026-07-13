const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase (server-side, singleton) ──────────────
const SUPA_URL = 'https://bxgbijoqrhvnwzdchedr.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2Jpam9xcmh2bnd6ZGNoZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ1MjUsImV4cCI6MjA5MDgxMDUyNX0.vuxFdc6ps06v41YvpTe3igN8XgXpJsSoCh9zD3bdWiU';
const supabase = createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// ── Middleware ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Helpers ───────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
    return typeof str === 'string' && UUID_REGEX.test(str);
}

function sanitizeString(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLen);
}

// ── In-memory throttle for /api/track (per user, per feature+action) ──
// Prevents duplicate DB writes from rapid clicks
const trackThrottle = new Map(); // key -> timestamp
const THROTTLE_MS = 5000; // 5s cooldown per unique tracking event

function isThrottled(key) {
    const now = Date.now();
    const last = trackThrottle.get(key);
    if (last && now - last < THROTTLE_MS) return true;
    trackThrottle.set(key, now);
    // Cleanup old entries periodically (prevent memory leak in long-running)
    if (trackThrottle.size > 5000) {
        for (const [k, v] of trackThrottle) {
            if (now - v > THROTTLE_MS * 2) trackThrottle.delete(k);
        }
    }
    return false;
}

// ── AUTH API ROUTES ────────────────────────────────

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const name = sanitizeString(req.body?.name, 100);
    const email = sanitizeString(req.body?.email, 254);
    const password = req.body?.password;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            console.error('[Signup Error]', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        // Upsert into users_realtime — the trigger also does this, but upsert
        // with onConflict ensures idempotency (no duplicate key errors)
        if (data?.user?.id) {
            const { error: upsertErr } = await supabase.from('users_realtime').upsert([{
                id: data.user.id,
                email: data.user.email,
                full_name: name,
                created_at: new Date().toISOString()
            }], { onConflict: 'id', ignoreDuplicates: true });

            if (upsertErr) {
                // Non-fatal: the trigger may have already inserted the row
                console.warn('[Signup] users_realtime upsert warning:', upsertErr.message);
            }
        }

        const hasSession = !!(data?.session);
        console.log(`[Signup OK] ${email} | Auto-login: ${hasSession}`);

        return res.json({
            success: true,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: name
            },
            session: hasSession ? {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            } : null,
            requiresEmailConfirmation: !hasSession
        });
    } catch (err) {
        console.error('[Signup Exception]', err.message);
        return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const email = sanitizeString(req.body?.email, 254);
    const password = req.body?.password;

    if (!email || !password || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[Login Error]', error.message);
            return res.status(401).json({ success: false, error: error.message });
        }

        if (!data?.session || !data?.user) {
            return res.status(401).json({ success: false, error: 'Authentication failed. Please try again.' });
        }

        console.log(`[Login OK] ${email}`);
        return res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.full_name || data.user.email.split('@')[0]
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            }
        });
    } catch (err) {
        console.error('[Login Exception]', err.message);
        return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
});

// POST /api/logout  (session is managed client-side via sessionStorage)
app.post('/api/logout', (req, res) => res.json({ success: true }));

// POST /api/track  (feature usage — non-critical, throttled, validated)
app.post('/api/track', async (req, res) => {
    const user_id = req.body?.user_id;
    const feature_name = sanitizeString(req.body?.feature_name, 100);
    const action = sanitizeString(req.body?.action, 200);

    // Validate UUID to prevent FK violations
    if (!user_id || !isValidUUID(user_id)) {
        return res.json({ success: false, reason: 'invalid_user' });
    }
    if (!feature_name || !action) {
        return res.json({ success: false, reason: 'missing_fields' });
    }

    // Throttle: same user + feature + action within 5s = skip
    const throttleKey = `${user_id}:${feature_name}:${action}`;
    if (isThrottled(throttleKey)) {
        return res.json({ success: true, throttled: true });
    }

    try {
        const { error } = await supabase.from('user_feature_history').insert([{
            user_id,
            feature_name,
            action
        }]);

        if (error) {
            // Log but don't crash — tracking is non-critical
            console.warn('[Track Warning]', error.message);
            return res.json({ success: false, reason: error.message });
        }

        return res.json({ success: true });
    } catch (e) {
        console.warn('[Track Exception]', e.message);
        return res.json({ success: false });
    }
});

// ── PAGE ROUTES ────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'auth', 'auth.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'auth', 'signup.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));
app.get('/test', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'auth', 'test_auth.html')));

// ── Static assets (images, fonts, etc.) ───────────
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ── Fallback ───────────────────────────────────────
app.use((req, res) => res.redirect('/login'));

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n=========================================`);
        console.log(`🚀 Server is running!`);
        console.log(`👉 http://localhost:${PORT}`);
        console.log(`=========================================\n`);
    });
}

module.exports = app;
