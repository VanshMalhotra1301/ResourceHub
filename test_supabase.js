const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bxgbijoqrhvnwzdchedr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Z2Jpam9xcmh2bnd6ZGNoZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ1MjUsImV4cCI6MjA5MDgxMDUyNX0.vuxFdc6ps06v41YvpTe3igN8XgXpJsSoCh9zD3bdWiU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
    console.log("Testing Supabase Signup...");
    const { data, error } = await supabase.auth.signUp({
        email: 'test' + Date.now() + '@example.com',
        password: 'password123',
        options: {
            data: {
                full_name: 'Test User',
            }
        }
    });

    if (error) {
        console.error("Signup Error:", error);
    } else {
        console.log("Signup Success:", data);
    }
}

testSignup();
