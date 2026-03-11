import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
    console.log("Testing update with anon key...");

    const { error } = await supabaseAnon
        .from('tier_settings')
        .update({ min_score: 23 })
        .eq('tier', 'P1');

    if (error) {
        console.error("Update failed:", error);
    } else {
        console.log("Update succeeded with anon key!");
    }
}

check();
