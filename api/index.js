const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase Configuration (Singleton) ──────────────
const SUPA_URL = process.env.SUPABASE_URL || 'https://bxgbijoqrhvnwzdchedr.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2Jpam9xcmh2bnd6ZGNoZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ1MjUsImV4cCI6MjA5MDgxMDUyNX0.vuxFdc6ps06v41YvpTe3igN8XgXpJsSoCh9zD3bdWiU';

const supabase = createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// ── Middleware ─────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Validation & Sanitization Helpers ──────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUUID(str) {
    return typeof str === 'string' && UUID_REGEX.test(str);
}

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email.trim()) && email.length <= 254;
}

function sanitizeString(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLen);
}

// ── In-Memory Throttle for Telemetry ──────────────
const trackThrottle = new Map();
const THROTTLE_MS = 5000;

function isThrottled(key) {
    const now = Date.now();
    const last = trackThrottle.get(key);
    if (last && now - last < THROTTLE_MS) return true;
    trackThrottle.set(key, now);
    
    // Periodically cleanup cache if large
    if (trackThrottle.size > 2000) {
        for (const [k, v] of trackThrottle) {
            if (now - v > THROTTLE_MS * 3) trackThrottle.delete(k);
        }
    }
    return false;
}

// ── API ROUTES ─────────────────────────────────────

// GET /api/health - Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const { error } = await supabase.from('users_realtime').select('id').limit(1);
        if (error) {
            return res.status(500).json({ status: 'degraded', database: error.message });
        }
        return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (e) {
        return res.status(500).json({ status: 'unhealthy', error: e.message });
    }
});

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const name = sanitizeString(req.body?.name, 100);
    const email = sanitizeString(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
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

        // Sync to public.users_realtime (idempotent upsert)
        if (data?.user?.id) {
            const { error: upsertErr } = await supabase.from('users_realtime').upsert([{
                id: data.user.id,
                email: data.user.email,
                full_name: name,
                created_at: new Date().toISOString()
            }], { onConflict: 'id' });

            if (upsertErr) {
                console.warn('[Signup] users_realtime upsert notice:', upsertErr.message);
            }
        }

        const hasSession = !!(data?.session);
        console.log(`[Signup OK] ${email} | Session: ${hasSession}`);

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
        return res.status(500).json({ success: false, error: 'Server error during signup. Please try again.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const email = sanitizeString(req.body?.email, 254).toLowerCase();
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
            return res.status(401).json({ success: false, error: 'Authentication failed. Please check credentials.' });
        }

        let userName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
        if (!userName) {
            try {
                const { data: profile } = await supabase
                    .from('users_realtime')
                    .select('full_name')
                    .eq('id', data.user.id)
                    .maybeSingle();
                if (profile?.full_name) {
                    userName = profile.full_name;
                }
            } catch (e) { /* non-fatal */ }
        }
        if (!userName) {
            userName = data.user.email.split('@')[0];
        }

        console.log(`[Login OK] ${email} (${userName})`);
        return res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                name: userName
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            }
        });
    } catch (err) {
        console.error('[Login Exception]', err.message);
        return res.status(500).json({ success: false, error: 'Server error during login. Please try again.' });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => res.json({ success: true }));

// POST /api/track (telemetry tracking)
app.post('/api/track', async (req, res) => {
    const user_id = req.body?.user_id;
    const feature_name = sanitizeString(req.body?.feature_name, 100);
    const action = sanitizeString(req.body?.action, 200);

    // Validate UUID to prevent FK constraint failures
    if (!user_id || !isValidUUID(user_id)) {
        return res.json({ success: false, reason: 'invalid_user_id' });
    }
    if (!feature_name || !action) {
        return res.json({ success: false, reason: 'missing_fields' });
    }

    // Cooldown check per user/feature/action
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
            console.warn('[Track Notice]', error.message);
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
app.get('/sem1', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'semesters', 'sem1.html')));
app.get('/sem2', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'semesters', 'sem2.html')));
app.get('/sem3', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'semesters', 'sem3.html')));
app.get('/sem4', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'semesters', 'sem4.html')));
app.get('/sem5', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'semesters', 'sem5.html')));
app.get('/library', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'library.html')));
app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'courses.html')));
app.get('/tools', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'tools.html')));
app.get('/dsa', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'dsa', 'visual-dsa.html')));
app.get('/dsa/visual-dsa.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'dsa', 'visual-dsa.html')));
app.get('/visual-dsa.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'dsa', 'visual-dsa.html')));
app.get('/dsa/:file', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'dsa', req.params.file)));
app.get('/dsa-:file', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'dsa', 'dsa-' + req.params.file)));
app.get('/os', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'os', 'os-visual.html')));
app.get('/os/os-visual.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'os', 'os-visual.html')));
app.get('/os-visual.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'os', 'os-visual.html')));
app.get('/os/:file', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'os', req.params.file)));
app.get('/os-:file', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'os', 'os-' + req.params.file)));
app.get('/test', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'auth', 'test_auth.html')));

// ── Static Assets ──────────────────────────────────
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ── Fallback Handler ───────────────────────────────
app.use((req, res) => {
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
        return res.status(404).type('text/plain').send('Asset not found');
    }
    if (req.accepts('html')) {
        return res.redirect('/login');
    }
    return res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n=========================================`);
        console.log(`🚀 BU Resource Hub Server is running!`);
        console.log(`👉 http://localhost:${PORT}`);
        console.log(`=========================================\n`);
    });
}

module.exports = app;
