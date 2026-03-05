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
    const { tech_stack_id, questions, theory_questions } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Insert MCQ questions
    if (questions && questions.length > 0) {
      const mcqRows = questions.map((q: any) => ({
        tech_stack_id,
        question: q.question,
        options: q.options,
        correct_option: q.correct_option,
        difficulty: q.difficulty || 'Easy',
      }));

      const { error: mcqError } = await supabase.from('questions').insert(mcqRows);
      if (mcqError) throw mcqError;
    }

    // Insert theory questions
    if (theory_questions && theory_questions.length > 0) {
      const theoryRows = theory_questions.map((q: any) => ({
        tech_stack_id,
        question: q.question,
      }));

      const { error: theoryError } = await supabase.from('theory_questions').insert(theoryRows);
      if (theoryError) throw theoryError;
    }

    return new Response(JSON.stringify({
      success: true,
      mcq_count: questions?.length || 0,
      theory_count: theory_questions?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
