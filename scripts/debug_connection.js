
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Env vars missing.");
    process.exit(1);
}

async function run() {
    console.log("🔍 DIAGNOSTIC: Checking All Schemas...");

    // Check 'game1'
    const sbGame1 = createClient(url, key, { db: { schema: 'game1' } });
    const { error: g1Error } = await sbGame1.from('players').select('count', { count: 'exact', head: true });

    if (g1Error) {
        console.log(`❌ game1.players: NOT FOUND or ERROR (${g1Error.code})`);
    } else {
        console.log("✅ game1.players: FOUND");
    }

    // Check 'public'
    const sbPublic = createClient(url, key, { db: { schema: 'public' } });
    const { error: pError } = await sbPublic.from('players').select('count', { count: 'exact', head: true });

    if (pError) {
        console.log(`❌ public.players: NOT FOUND or ERROR (${pError.code})`);
    } else {
        console.log("✅ public.players: FOUND");
    }
}

run();
