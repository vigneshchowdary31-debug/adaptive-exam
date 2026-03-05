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
    const { session_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    // Mark session as finished
    await supabase
      .from('exam_sessions')
      .update({ is_finished: true, end_time: new Date().toISOString() })
      .eq('id', session_id);

    // Calculate MCQ score based on difficulty points
    // Easy = 1 pt, Medium = 2 pts, Hard = 3 pts
    const { data: responses } = await supabase
      .from('responses')
      .select(`
        is_correct,
        questions!inner(difficulty)
      `)
      .eq('student_id', session.student_id);

    const totalMcq = responses?.length || 0;
    const correctMcq = responses?.filter((r: any) => r.is_correct).length || 0;

    let mcqScore = 0;
    if (responses) {
      responses.forEach((r: any) => {
        if (r.is_correct) {
          if (r.questions.difficulty === 'Easy') mcqScore += 1;
          else if (r.questions.difficulty === 'Medium') mcqScore += 2;
          else if (r.questions.difficulty === 'Hard') mcqScore += 3;
        }
      });
    }

    // Theory score calculation (keeping simple for compatibility, but maybe adjusting weight)
    const { data: theoryResponses } = await supabase
      .from('theory_responses')
      .select('answer_text')
      .eq('student_id', session.student_id);

    const theoryTotal = 2;
    let theoryCorrect = 0;
    theoryResponses?.forEach((t: any) => {
      if (t.answer_text && t.answer_text.trim().length > 10) theoryCorrect++;
    });
    // We didn't get instructions to change Theory points, but Total Score logic says:
    // "Total score > 22 -> P1". And max MCQ score could be (5*1 + 5*2 + 5*3) = 30 points.
    // If the rule entirely ignores theory or includes it, we'll assume total score is just mcqScore for the strict bounds defined, 
    // or add theory as arbitrary points. Let's make theoryScore separate and totalScore = mcqScore, since the rules given didn't mention theory.
    // However, I will map totalScore = mcqScore just for the tier logic, and still save theoryScore.
    const theoryScore = Math.round((theoryCorrect / theoryTotal) * 100);

    const totalScore = mcqScore; // Based solely on the new rules provided

    // Tier classification based on absolute point cutoffs
    let assignedTier = 'P3';
    if (totalScore > 22) {
      assignedTier = 'P1';
    } else if (totalScore > 15) {
      assignedTier = 'P2';
    }

    // Save result
    await supabase.from('results').insert({
      student_id: session.student_id,
      tech_stack_id: session.tech_stack_id,
      mcq_score: mcqScore,
      theory_score: theoryScore,
      total_score: totalScore,
      assigned_tier: assignedTier,
    });

    return new Response(JSON.stringify({
      mcq_score: mcqScore,
      theory_score: theoryScore,
      total_score: totalScore,
      assigned_tier: assignedTier,
      violations: session.violations,
      correct_mcq: correctMcq,
      theory_attempted: theoryCorrect, // Using theoryCorrect as the count of attempted theory questions
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
