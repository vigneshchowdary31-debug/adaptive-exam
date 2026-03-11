import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
    console.log("Checking with anon key (how the app fetches it):");
    const { data: anonData, error: anonError } = await supabaseAnon.from('tier_settings').select('*');
    console.log('Anon Data:', anonData);
    console.log('Anon Error:', anonError?.message || 'None');

    // Also check if the table just doesn't exist or is empty
}

check();
