const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const ChatbotNLP = require('../js/chatbot-nlp');
const ChatbotKB = require('../js/chatbot-kb');

let serverNlpEngine = null;
try {
    serverNlpEngine = new ChatbotNLP(ChatbotKB);
    serverNlpEngine.initialize();
} catch (e) {
    console.error('[Chatbot NLP] Server initialization error:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase Configuration (Env-Only — no hardcoded secrets) ──
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPA_URL || !SUPA_KEY) {
    console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
    // Allow the server to start for static pages, but auth endpoints will fail gracefully
}

const supabase = (SUPA_URL && SUPA_KEY)
    ? createClient(SUPA_URL, SUPA_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

// ── Security Headers Middleware ────────────────────
app.use((req, res, next) => {
    // Request tracing ID
    req.requestId = crypto.randomBytes(8).toString('hex');
    res.setHeader('X-Request-Id', req.requestId);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // CORS — allow configured origins, Vercel deployments, same-host requests, and local dev
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
        : [];

    const origin = req.headers.origin;
    const host = req.headers.host;
    const isAllowedOrigin = origin && (
        allowedOrigins.includes(origin) ||
        (host && origin.replace(/^https?:\/\//, '') === host) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
    );

    if (origin && isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// ── Body Parsing Middleware ───────────────────────
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

// ── In-Memory Rate Limiter for Auth Endpoints ─────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 20; // max 20 auth attempts per IP per window

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false; // not limited
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return true; // rate limited
    }
    return false;
}

// Periodic cleanup of stale rate limit entries (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000).unref();

// Rate limit middleware for auth routes
function authRateLimit(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (checkRateLimit(ip)) {
        console.warn(`[Rate Limit] Blocked ${ip} on ${req.path}`);
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.'
        });
    }
    next();
}

// ── In-Memory Throttle for Telemetry ──────────────
const trackThrottle = new Map();
const THROTTLE_MS = 5000;

function isThrottled(key) {
    const now = Date.now();
    const last = trackThrottle.get(key);
    if (last && now - last < THROTTLE_MS) return true;
    trackThrottle.set(key, now);

    // Efficient eviction when map gets large
    if (trackThrottle.size > 2000) {
        const cutoff = now - THROTTLE_MS * 3;
        for (const [k, v] of trackThrottle) {
            if (v < cutoff) trackThrottle.delete(k);
        }
    }
    return false;
}

// ── Supabase Guard Middleware ──────────────────────
function requireSupabase(req, res, next) {
    if (!supabase) {
        return res.status(503).json({
            success: false,
            error: 'Database service is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
        });
    }
    next();
}

// ── API ROUTES ─────────────────────────────────────

// GET /api/health - Health check endpoint
app.get('/api/health', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ status: 'unconfigured', message: 'Supabase credentials not set' });
    }
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
app.post('/api/signup', authRateLimit, requireSupabase, async (req, res) => {
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
    if (password.length > 128) {
        return res.status(400).json({ success: false, error: 'Password must not exceed 128 characters.' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            console.error(`[Signup Error] ${req.requestId}:`, error.message);
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
                console.warn(`[Signup] ${req.requestId} users_realtime upsert notice:`, upsertErr.message);
            }
        }

        const hasSession = !!(data?.session);
        console.log(`[Signup OK] ${req.requestId} ${email} | Session: ${hasSession}`);

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
        console.error(`[Signup Exception] ${req.requestId}:`, err.message);
        return res.status(500).json({ success: false, error: 'Server error during signup. Please try again.' });
    }
});

// POST /api/login
app.post('/api/login', authRateLimit, requireSupabase, async (req, res) => {
    const email = sanitizeString(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;

    if (!email || !password || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error(`[Login Error] ${req.requestId}:`, error.message);
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

        console.log(`[Login OK] ${req.requestId} ${email} (${userName})`);
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
        console.error(`[Login Exception] ${req.requestId}:`, err.message);
        return res.status(500).json({ success: false, error: 'Server error during login. Please try again.' });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => res.json({ success: true }));

// POST /api/track (telemetry tracking)
app.post('/api/track', requireSupabase, async (req, res) => {
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
            console.warn(`[Track Notice] ${req.requestId}:`, error.message);
            return res.json({ success: false, reason: error.message });
        }

        return res.json({ success: true });
    } catch (e) {
        console.warn(`[Track Exception] ${req.requestId}:`, e.message);
        return res.json({ success: false });
    }
});

// ── Isolated Per-Session Chatbot Context Store ─────
const chatSessions = new Map();
const CHAT_SESSION_TTL_MS = 30 * 60 * 1000;

function getOrCreateChatContext(sessionId, reset = false) {
    if (!serverNlpEngine) return null;
    if (!sessionId) {
        return serverNlpEngine.createEmptyContext();
    }
    const now = Date.now();
    if (reset || !chatSessions.has(sessionId)) {
        if (chatSessions.size >= 500) {
            const oldestKey = chatSessions.keys().next().value;
            chatSessions.delete(oldestKey);
        }
        const fresh = { context: serverNlpEngine.createEmptyContext(), updatedAt: now };
        chatSessions.set(sessionId, fresh);
        return fresh.context;
    }
    const entry = chatSessions.get(sessionId);
    if (now - entry.updatedAt > CHAT_SESSION_TTL_MS) {
        entry.context = serverNlpEngine.createEmptyContext();
    }
    entry.updatedAt = now;
    return entry.context;
}

// POST /api/chat - Custom NLP Chatbot Query Endpoint
app.post('/api/chat', (req, res) => {
    const message = sanitizeString(req.body?.message, 500);
    if (!message) {
        return res.status(400).json({ success: false, error: 'Query message is required.' });
    }

    if (!serverNlpEngine) {
        return res.status(503).json({ success: false, error: 'Chatbot NLP engine unavailable.' });
    }

    try {
        const sessionId = sanitizeString(req.body?.sessionId, 100);
        const reset = Boolean(req.body?.resetContext);
        const sessionCtx = getOrCreateChatContext(sessionId, reset);
        const response = serverNlpEngine.processQuery(message, { context: sessionCtx });
        return res.json({
            success: true,
            response,
            sessionId: sessionId || null
        });
    } catch (err) {
        console.error(`[Chat API Error] ${req.requestId}:`, err.message);
        return res.status(500).json({ success: false, error: 'Failed to process query' });
    }
});

// ── PAGE ROUTES (Data-Driven) ──────────────────────
const ROOT_DIR = path.join(__dirname, '..');
const ALLOWED_EXTENSIONS = new Set(['.html', '.htm']);

const PAGE_ROUTES = {
    '/login':  'pages/auth/auth.html',
    '/signup': 'pages/auth/signup.html',
    '/home':   'index.html',
    '/sem1':   'pages/semesters/sem1.html',
    '/sem2':   'pages/semesters/sem2.html',
    '/sem3':   'pages/semesters/sem3.html',
    '/sem4':   'pages/semesters/sem4.html',
    '/sem5':   'pages/semesters/sem5.html',
    '/library':  'pages/library.html',
    '/courses':  'pages/courses.html',
    '/tools':    'pages/tools.html',
    '/dsa':      'pages/dsa/visual-dsa.html',
    '/dsa/visual-dsa.html': 'pages/dsa/visual-dsa.html',
    '/visual-dsa.html':     'pages/dsa/visual-dsa.html',
    '/os':       'pages/os/os-visual.html',
    '/os/os-visual.html':   'pages/os/os-visual.html',
    '/os-visual.html':      'pages/os/os-visual.html',
    '/test':     'pages/auth/test_auth.html'
};

// Register all static page routes
for (const [route, filePath] of Object.entries(PAGE_ROUTES)) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(ROOT_DIR, filePath));
    });
}

// Root redirect
app.get('/', (req, res) => res.redirect('/login'));

// ── Safe Dynamic File Routes (Path Traversal Protected) ──
function serveSafeFile(baseDir) {
    return (req, res, next) => {
        const requestedFile = req.params.file;

        // Block path traversal attempts
        if (!requestedFile || requestedFile.includes('..') || requestedFile.includes('\0')) {
            return res.status(400).type('text/plain').send('Invalid file path');
        }

        const ext = path.extname(requestedFile).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return res.status(403).type('text/plain').send('File type not allowed');
        }

        const resolvedPath = path.resolve(baseDir, requestedFile);

        // Ensure resolved path stays within the base directory
        if (!resolvedPath.startsWith(path.resolve(baseDir))) {
            return res.status(403).type('text/plain').send('Access denied');
        }

        res.sendFile(resolvedPath, (err) => {
            if (err) {
                res.status(404).type('text/plain').send('File not found');
            }
        });
    };
}

app.get('/dsa/:file', serveSafeFile(path.join(ROOT_DIR, 'pages', 'dsa')));
app.get('/dsa-:file', (req, res) => {
    const safeReq = { params: { file: 'dsa-' + req.params.file } };
    serveSafeFile(path.join(ROOT_DIR, 'pages', 'dsa'))(safeReq, res);
});
app.get('/os/:file', serveSafeFile(path.join(ROOT_DIR, 'pages', 'os')));
app.get('/os-:file', (req, res) => {
    const safeReq = { params: { file: 'os-' + req.params.file } };
    serveSafeFile(path.join(ROOT_DIR, 'pages', 'os'))(safeReq, res);
});

// ── Static Assets ──────────────────────────────────
app.use(express.static(ROOT_DIR, {
    index: false,
    dotfiles: 'deny',       // Block .env, .git, etc.
    maxAge: '1d'             // Cache static assets for 1 day
}));

// ── Global Error Handler ───────────────────────────
app.use((req, res) => {
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/i.test(req.path)) {
        return res.status(404).type('text/plain').send('Asset not found');
    }
    if (req.accepts('html')) {
        return res.redirect('/login');
    }
    return res.status(404).json({ error: 'Not found' });
});

// Uncaught error handler
app.use((err, req, res, _next) => {
    console.error(`[Unhandled Error] ${req.requestId || 'no-id'}:`, err.message);
    res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n=========================================`);
        console.log(`🚀 BU Resource Hub Server is running!`);
        console.log(`👉 http://localhost:${PORT}`);
        console.log(`   Supabase: ${supabase ? '✅ Connected' : '⚠️  NOT CONFIGURED'}`);
        console.log(`=========================================\n`);
    });
}

module.exports = app;
