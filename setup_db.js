const { Client } = require('pg');

const DATABASE_URL = 'postgres://postgres:Vansh%40ww22iixxzz@db.bxgbijoqrhvnwzdchedr.supabase.co:5432/postgres';

async function setupDatabase() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to Supabase Postgres database.");

        // Create the feature history table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_feature_history (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id uuid REFERENCES auth.users NOT NULL,
                feature_name text NOT NULL,
                action text NOT NULL,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `);
        console.log("Created user_feature_history table.");

        // Create the users table to visibly store credentials in public schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.users_realtime (
                id uuid PRIMARY KEY,
                email text NOT NULL,
                full_name text,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `);

        // Ensure full_name column exists
        await client.query(`
            ALTER TABLE public.users_realtime ADD COLUMN IF NOT EXISTS full_name text;
        `);

        console.log("Created users_realtime table.");

        // Create a trigger to automatically sync auth.users to public.users_realtime
        await client.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_user() 
            RETURNS trigger AS $$
            BEGIN
                INSERT INTO public.users_realtime (id, email, full_name)
                VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
                RETURN new;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);

        // Ensure the trigger exists only once
        await client.query(`
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        `);
        console.log("Created trigger to sync users automatically in real-time.");

        console.log("Database set up successfully! Users can now sign up and everything works.");
    } catch (err) {
        console.error("Error setting up database:", err);
    } finally {
        await client.end();
    }
}

setupDatabase();
