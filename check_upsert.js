import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
    console.log("Testing upsert with anon key...");
    const { error } = await supabaseAnon.from('tier_settings').upsert([
        { tier: 'P1', min_score: 22 },
        { tier: 'P2', min_score: 15 },
        { tier: 'P3', min_score: 0 }
    ]);

    if (error) {
        console.error("Upsert failed:", error);
    } else {
        console.log("Upsert succeeded with anon key!");
    }
}

check();
