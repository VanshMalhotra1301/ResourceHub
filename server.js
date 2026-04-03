const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase (server-side, no browser dependency) ──
const SUPA_URL = 'https://bxgbijoqrhvnwzdchedr.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2Jpam9xcmh2bnd6ZGNoZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ1MjUsImV4cCI6MjA5MDgxMDUyNX0.vuxFdc6ps06v41YvpTe3igN8XgXpJsSoCh9zD3bdWiU';
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Middleware ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── AUTH API ROUTES ────────────────────────────────

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (password.length < 6) {
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

        // Also insert into users_realtime table
        if (data?.user) {
            await supabase.from('users_realtime').upsert([{
                id: data.user.id,
                email: data.user.email,
                full_name: name,
                created_at: new Date().toISOString()
            }], { onConflict: 'id' });
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
        return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[Login Error]', error.message);
            return res.status(401).json({ success: false, error: error.message });
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
        return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
});

// POST /api/logout  (session is managed client-side via sessionStorage)
app.post('/api/logout', (req, res) => res.json({ success: true }));

// POST /api/track  (feature usage — non-critical)
app.post('/api/track', async (req, res) => {
    const { user_id, feature_name, action } = req.body;
    if (!user_id) return res.json({ success: false });
    try {
        await supabase.from('user_feature_history').insert([{ user_id, feature_name, action }]);
        return res.json({ success: true });
    } catch (e) {
        return res.json({ success: false });
    }
});

// ── PAGE ROUTES ────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/test', (req, res) => res.sendFile(path.join(__dirname, 'test_auth.html')));

// ── Static assets (images, fonts, etc.) ───────────
app.use(express.static(path.join(__dirname), { index: false }));

// ── Fallback ───────────────────────────────────────
app.use((req, res) => res.redirect('/login'));

app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`🚀 Server is running!`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`=========================================\n`);
});
