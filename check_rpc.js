import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
    console.log("Testing RPC with anon key...");
    const { data, error } = await supabaseAnon.rpc('recalculate_all_tiers');

    if (error) {
        console.error("RPC failed:", error);
    } else {
        console.log("RPC succeeded with anon key!", data);
    }
}

check();
