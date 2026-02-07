
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'game1' }
});

async function check() {
    console.log("🔍 Checking Supabase Connection...");

    try {
        const { data, error } = await supabase.from('players').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("❌ DB Check Failed:", error.message);
            if (error.code === '42P01') { // undefined_table
                console.log("👉 CONCLUSION: Tables are MISSING. Run the SQL.");
            } else {
                console.log("👉 CONCLUSION: Connection Error.");
            }
        } else {
            console.log("✅ DB Check Success! 'players' table exists.");
        }
    } catch (e) {
        console.error("❌ Unexpected Error:", e);
    }
}

check();
