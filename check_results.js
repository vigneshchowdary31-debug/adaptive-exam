import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
    const { data, error } = await supabaseAnon.from('results').select('id, total_score, assigned_tier').limit(10);
    console.log('Results Sample:', data);
    console.log('Error:', error?.message || 'None');
}

check();
