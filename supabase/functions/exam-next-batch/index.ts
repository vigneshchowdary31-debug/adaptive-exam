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

    // Check time
    const elapsed = (Date.now() - new Date(session.start_time).getTime()) / 1000;
    if (elapsed >= 20 * 60 || session.is_finished) {
      return new Response(JSON.stringify({ finished: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.questions_answered >= 15) {
      return new Response(JSON.stringify({ finished: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get already answered question IDs
    const { data: answered } = await supabase
      .from('responses')
      .select('question_id')
      .eq('student_id', session.student_id);

    const answeredIds = (answered || []).map((a: any) => a.question_id);

    // Adaptive algorithm: evaluate last 3 answers
    const currentDifficulty = session.current_difficulty || 'Easy';
    let nextDifficulty = currentDifficulty;

    if (session.questions_answered > 0 && session.questions_answered % 3 === 0) {
      const { data: recentResponses } = await supabase
        .from('responses')
        .select('is_correct')
        .eq('student_id', session.student_id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentResponses && recentResponses.length === 3) {
        const correct = recentResponses.filter((r: any) => r.is_correct).length;
        const accuracy = (correct / 3) * 100;

        if (accuracy >= 80) {
          if (currentDifficulty === 'Easy') nextDifficulty = 'Medium';
          else if (currentDifficulty === 'Medium') nextDifficulty = 'Hard';
        } else if (accuracy <= 40) {
          if (currentDifficulty === 'Hard') nextDifficulty = 'Medium';
          else if (currentDifficulty === 'Medium') nextDifficulty = 'Easy';
        }
      }
    }

    // Fetch questions at current difficulty, excluding answered ones
    let query = supabase
      .from('questions')
      .select('id, question, options, difficulty')
      .eq('tech_stack_id', session.tech_stack_id)
      .eq('difficulty', nextDifficulty)
      .lt('created_at', session.start_time)
      .limit(3);

    if (answeredIds.length > 0) {
      query = query.not('id', 'in', `(${answeredIds.join(',')})`);
    }

    let { data: questions } = await query;

    // If not enough questions at this difficulty, try adjacent difficulties
    if (!questions || questions.length < 3) {
      const fallbackDifficulties = nextDifficulty === 'Easy' ? ['Medium', 'Hard'] :
        nextDifficulty === 'Hard' ? ['Medium', 'Easy'] : ['Easy', 'Hard'];

      for (const fb of fallbackDifficulties) {
        if (questions && questions.length >= 3) break;
        let fbQuery = supabase
          .from('questions')
          .select('id, question, options, difficulty')
          .eq('tech_stack_id', session.tech_stack_id)
          .eq('difficulty', fb)
          .lt('created_at', session.start_time)
          .limit(3 - (questions?.length || 0));

        const excludeIds = [...answeredIds, ...(questions || []).map(q => q.id)];
        if (excludeIds.length > 0) {
          fbQuery = fbQuery.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data: fbQuestions } = await fbQuery;
        questions = [...(questions || []), ...(fbQuestions || [])];
      }
    }

    // Update session difficulty
    if (nextDifficulty !== currentDifficulty) {
      await supabase
        .from('exam_sessions')
        .update({ current_difficulty: nextDifficulty })
        .eq('id', session_id);
    }

    return new Response(JSON.stringify({
      questions: (questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      })),
      difficulty: nextDifficulty,
      remaining_questions: 15 - session.questions_answered,
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
