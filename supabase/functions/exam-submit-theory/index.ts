import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, question_id, answer_text } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: session } = await supabase
      .from('exam_sessions')
      .select('student_id')
      .eq('id', session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response already exists
    const { data: existingResponse } = await supabase
      .from('theory_responses')
      .select('id')
      .eq('student_id', session.student_id)
      .eq('question_id', question_id)
      .maybeSingle();

    if (existingResponse) {
      // Return early with success to prevent erroring out frontend
      return new Response(JSON.stringify({ success: true, message: 'Already submitted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('theory_responses').insert({
      student_id: session.student_id,
      question_id,
      answer_text: answer_text || '',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
