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
    const { session_id, question_id, selected_option } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get session
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get correct answer
    const { data: question } = await supabase
      .from('questions')
      .select('correct_option')
      .eq('id', question_id)
      .single();

    const isCorrect = question?.correct_option === selected_option;

    // Save response
    await supabase.from('responses').insert({
      student_id: session.student_id,
      question_id,
      selected_option,
      is_correct: isCorrect,
    });

    // Update session
    await supabase
      .from('exam_sessions')
      .update({ questions_answered: session.questions_answered + 1 })
      .eq('id', session_id);

    return new Response(JSON.stringify({ is_correct: isCorrect }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
