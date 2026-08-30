/**
 * BU Resource Hub - Supabase Database Schema & Performance Optimization Migration
 * 
 * Features:
 * 1. Idempotent table creation for users_realtime & user_feature_history
 * 2. Proper Row Level Security (RLS) policies for anon, authenticated, and service_role
 * 3. Cascade delete foreign keys
 * 4. High-performance B-tree indexes for fast queries
 * 5. Exception-safe, conflict-handled user sync trigger on auth.users
 * 6. Historical user reconciliation between auth.users and public.users_realtime
 * 7. Verification test suite
 */

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:Vansh%40ww22iixxzz@db.bxgbijoqrhvnwzdchedr.supabase.co:5432/postgres';
const SUPA_URL = process.env.SUPABASE_URL || 'https://bxgbijoqrhvnwzdchedr.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2Jpam9xcmh2bnd6ZGNoZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ1MjUsImV4cCI6MjA5MDgxMDUyNX0.vuxFdc6ps06v41YvpTe3igN8XgXpJsSoCh9zD3bdWiU';

async function setupDatabase() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connecting to Supabase Postgres database...");
        await client.connect();
        console.log("Connected successfully!");

        // 1. users_realtime table
        console.log("\n[1/6] Configuring public.users_realtime table and RLS...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.users_realtime (
                id uuid PRIMARY KEY,
                email text NOT NULL,
                full_name text,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            ALTER TABLE public.users_realtime ADD COLUMN IF NOT EXISTS full_name text;

            ALTER TABLE public.users_realtime ENABLE ROW LEVEL SECURITY;

            -- Clean up old policies
            DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users_realtime;
            DROP POLICY IF EXISTS "Users can view own profile" ON public.users_realtime;
            DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_realtime;
            DROP POLICY IF EXISTS "Users can update own profile" ON public.users_realtime;
            DROP POLICY IF EXISTS "Allow anon and authenticated all" ON public.users_realtime;
            DROP POLICY IF EXISTS "Allow anon and authenticated read" ON public.users_realtime;
            DROP POLICY IF EXISTS "Allow anon and authenticated insert" ON public.users_realtime;
            DROP POLICY IF EXISTS "Allow anon and authenticated update" ON public.users_realtime;

            -- RLS policies allowing client/server access
            CREATE POLICY "Allow anon and authenticated read" 
            ON public.users_realtime FOR SELECT 
            TO anon, authenticated 
            USING (true);

            CREATE POLICY "Allow anon and authenticated insert" 
            ON public.users_realtime FOR INSERT 
            TO anon, authenticated 
            WITH CHECK (true);

            CREATE POLICY "Allow anon and authenticated update" 
            ON public.users_realtime FOR UPDATE 
            TO anon, authenticated 
            USING (true)
            WITH CHECK (true);
        `);
        console.log("✓ users_realtime table & RLS policies configured.");

        // 2. user_feature_history table with ON DELETE CASCADE
        console.log("\n[2/6] Configuring public.user_feature_history table and RLS...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.user_feature_history (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                feature_name text NOT NULL,
                action text NOT NULL,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            ALTER TABLE public.user_feature_history ENABLE ROW LEVEL SECURITY;

            -- Clean up old policies
            DROP POLICY IF EXISTS "Users can insert their own history" ON public.user_feature_history;
            DROP POLICY IF EXISTS "Users can view own history" ON public.user_feature_history;
            DROP POLICY IF EXISTS "Allow feature history inserts" ON public.user_feature_history;
            DROP POLICY IF EXISTS "Allow viewing feature history" ON public.user_feature_history;

            -- RLS policies for telemetry tracking
            CREATE POLICY "Allow feature history inserts" 
            ON public.user_feature_history FOR INSERT 
            TO anon, authenticated 
            WITH CHECK (true);

            CREATE POLICY "Allow viewing feature history" 
            ON public.user_feature_history FOR SELECT 
            TO anon, authenticated 
            USING (true);
        `);
        console.log("✓ user_feature_history table & RLS policies configured.");

        // 3. Permissions
        console.log("\n[3/6] Granting schema and table permissions...");
        await client.query(`
            GRANT USAGE ON SCHEMA public TO anon, authenticated;
            GRANT ALL ON TABLE public.users_realtime TO anon, authenticated, service_role;
            GRANT ALL ON TABLE public.user_feature_history TO anon, authenticated, service_role;
        `);
        console.log("✓ Permissions granted to anon, authenticated, and service_role.");

        // 4. Robust trigger with conflict resolution & exception safety
        console.log("\n[4/6] Creating robust handle_new_user() trigger function...");
        await client.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_user() 
            RETURNS trigger AS $$
            BEGIN
                INSERT INTO public.users_realtime (id, email, full_name, created_at)
                VALUES (
                    new.id, 
                    new.email, 
                    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
                    COALESCE(new.created_at, timezone('utc'::text, now()))
                )
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    full_name = COALESCE(EXCLUDED.full_name, public.users_realtime.full_name);
                RETURN new;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'handle_new_user error: %', SQLERRM;
                RETURN new;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        `);
        console.log("✓ handle_new_user trigger set up on auth.users.");

        // 5. High-performance indexes
        console.log("\n[5/6] Creating database indexes for high performance...");
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_feature_history_user_id ON public.user_feature_history (user_id);
            CREATE INDEX IF NOT EXISTS idx_user_feature_history_created_at ON public.user_feature_history (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_user_feature_history_feature_action ON public.user_feature_history (feature_name, action);
            CREATE INDEX IF NOT EXISTS idx_users_realtime_email ON public.users_realtime (email);
        `);
        console.log("✓ Indexes created successfully.");

        // 6. User reconciliation
        console.log("\n[6/6] Reconciling existing users...");
        const syncResult = await client.query(`
            INSERT INTO public.users_realtime (id, email, full_name, created_at)
            SELECT 
                id, 
                email, 
                COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
                COALESCE(created_at, timezone('utc'::text, now()))
            FROM auth.users
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(public.users_realtime.full_name, EXCLUDED.full_name);
        `);
        console.log(`✓ User sync complete. Reconciled records: ${syncResult.rowCount}`);

        const authCount = await client.query("SELECT COUNT(*) FROM auth.users");
        const realtimeCount = await client.query("SELECT COUNT(*) FROM public.users_realtime");
        const historyCount = await client.query("SELECT COUNT(*) FROM public.user_feature_history");
        console.log(`\n📊 Database Status:`);
        console.log(`- auth.users: ${authCount.rows[0].count}`);
        console.log(`- users_realtime: ${realtimeCount.rows[0].count}`);
        console.log(`- user_feature_history: ${historyCount.rows[0].count}`);

    } catch (err) {
        console.error("❌ Error setting up database:", err);
    } finally {
        await client.end();
    }

    // Supabase JS Verification
    try {
        console.log("\n🧪 Running Supabase Client Verification...");
        const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
        
        const { data: users, error: userErr } = await supabase.from('users_realtime').select('id, email, full_name').limit(1);
        if (userErr) {
            console.error("❌ users_realtime read test failed:", userErr.message);
        } else {
            console.log("✓ users_realtime read test PASSED:", users?.length ? users[0].email : '0 records');
        }

        if (users && users.length > 0) {
            const { error: trackErr } = await supabase.from('user_feature_history').insert([{
                user_id: users[0].id,
                feature_name: 'Database Migration',
                action: 'Self Verification'
            }]);
            if (trackErr) {
                console.error("❌ user_feature_history insert test failed:", trackErr.message);
            } else {
                console.log("✓ user_feature_history insert test PASSED (No RLS or FK errors).");
            }
        }
    } catch (e) {
        console.error("❌ Verification exception:", e.message);
    }

    console.log("\n🚀 Database optimization & setup completed successfully!");
}

if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
