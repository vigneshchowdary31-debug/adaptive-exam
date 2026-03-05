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

    // Calculate MCQ score
    const { data: responses } = await supabase
      .from('responses')
      .select('is_correct, question_id')
      .eq('student_id', session.student_id);

    const totalMcq = responses?.length || 0;
    const correctMcq = responses?.filter((r: any) => r.is_correct).length || 0;
    const mcqScore = totalMcq > 0 ? Math.round((correctMcq / 15) * 100) : 0;

    // Calculate difficulty-based accuracy for tier
    const questionIds = responses?.map((r: any) => r.question_id) || [];
    let hardAccuracy = 0;
    let mediumAccuracy = 0;

    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, difficulty')
        .in('id', questionIds);

      const diffMap: Record<string, string> = {};
      questions?.forEach((q: any) => { diffMap[q.id] = q.difficulty; });

      const hardQs = responses?.filter((r: any) => diffMap[r.question_id] === 'Hard') || [];
      const medQs = responses?.filter((r: any) => diffMap[r.question_id] === 'Medium') || [];

      if (hardQs.length > 0) {
        hardAccuracy = (hardQs.filter((r: any) => r.is_correct).length / hardQs.length) * 100;
      }
      if (medQs.length > 0) {
        mediumAccuracy = (medQs.filter((r: any) => r.is_correct).length / medQs.length) * 100;
      }
    }

    // Theory score (simple: give 50% for any non-empty answer)
    const { data: theoryResponses } = await supabase
      .from('theory_responses')
      .select('answer_text')
      .eq('student_id', session.student_id);

    const theoryTotal = 2;
    let theoryCorrect = 0;
    theoryResponses?.forEach((t: any) => {
      if (t.answer_text && t.answer_text.trim().length > 10) theoryCorrect++;
    });
    const theoryScore = Math.round((theoryCorrect / theoryTotal) * 100);

    // Total score (MCQ 70%, Theory 30%)
    const totalScore = Math.round(mcqScore * 0.7 + theoryScore * 0.3);

    // Tier classification
    let assignedTier = 'P3';
    if (hardAccuracy >= 70 && totalScore >= 75) {
      assignedTier = 'P1';
    } else if (mediumAccuracy >= 60 && totalScore >= 50 && totalScore < 75) {
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
