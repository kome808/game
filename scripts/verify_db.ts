
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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
    console.log("URL:", supabaseUrl);

    try {
        const { data, error } = await supabase.from('players').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("❌ DB Check Failed:", error.message);
            console.error("Details:", JSON.stringify(error, null, 2));
            if (error.code === '42P01') {
                console.log("\n💡 HINT: Table 'players' does not exist. Please run the SQL script.");
            }
        } else {
            console.log("✅ DB Check Success! 'players' table reachable.");
            console.log("Row count:", data); // Might be null for head:true counting depending on lib version, but implies success
        }
    } catch (e) {
        console.error("❌ Unexpected Error:", e);
    }
}

check();
