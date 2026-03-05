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
    if (elapsed >= 10 * 60 || session.is_finished) {
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

    // Batch structure: 5 questions per batch
    const BATCH_SIZE = 5;

    // Adaptive algorithm
    const currentDifficulty = session.current_difficulty || 'Easy';
    let nextDifficulty = currentDifficulty;

    // We only adapt at the end of Batch 1 (5 questions) and Batch 2 (10 questions)
    if (session.questions_answered === 5) {
      // Evaluating Batch 1 (Easy)
      const { data: b1Responses } = await supabase
        .from('responses')
        .select(`
          is_correct,
          questions!inner(difficulty)
        `)
        .eq('student_id', session.student_id);

      if (b1Responses) {
        let b1Score = 0;
        b1Responses.forEach((r: any) => {
          if (r.is_correct) {
            b1Score += 1; // All batch 1 questions are Easy (1pt)
          }
        });

        // Rule for after Batch 1:
        // Score < 3 -> Stay Easy
        // Score >= 3 -> Move to Medium
        if (b1Score < 3) {
          nextDifficulty = 'Easy';
        } else {
          nextDifficulty = 'Medium';
        }
      }
    } else if (session.questions_answered === 10) {
      // Evaluating Batch 2 (and calculating cumulative score of Batch 1 + Batch 2)
      const { data: b2Responses } = await supabase
        .from('responses')
        .select(`
          is_correct,
          questions!inner(difficulty)
        `)
        .eq('student_id', session.student_id);

      if (b2Responses) {
        let cumulativeScore = 0;
        b2Responses.forEach((r: any) => {
          if (r.is_correct) {
            if (r.questions.difficulty === 'Easy') cumulativeScore += 1;
            else if (r.questions.difficulty === 'Medium') cumulativeScore += 2;
            else if (r.questions.difficulty === 'Hard') cumulativeScore += 3;
          }
        });

        // Rule for after Batch 2
        // Cumulative Score > 9 -> Move to Hard
        // Otherwise -> Continue with Medium (or stay if it somehow was Easy)
        if (cumulativeScore > 9) {
          nextDifficulty = 'Hard';
        } else {
          nextDifficulty = 'Medium';
        }
      }
    } else if (session.questions_answered === 0) {
      // Initial state
      nextDifficulty = 'Easy';
    }

    // Fetch questions at current difficulty, excluding answered ones
    const cutoffTime = session.question_cutoff_time || session.start_time;
    let query = supabase
      .from('questions')
      .select('id, question, options, difficulty')
      .eq('tech_stack_id', session.tech_stack_id)
      .eq('difficulty', nextDifficulty)
      .lt('created_at', cutoffTime)
      .limit(BATCH_SIZE);

    if (answeredIds.length > 0) {
      query = query.not('id', 'in', `(${answeredIds.join(',')})`);
    }

    let { data: questions } = await query;

    // If not enough questions at this difficulty, try adjacent difficulties
    if (!questions || questions.length < BATCH_SIZE) {
      const fallbackDifficulties = nextDifficulty === 'Easy' ? ['Medium', 'Hard'] :
        nextDifficulty === 'Hard' ? ['Medium', 'Easy'] : ['Easy', 'Hard'];

      for (const fb of fallbackDifficulties) {
        if (questions && questions.length >= BATCH_SIZE) break;
        let fbQuery = supabase
          .from('questions')
          .select('id, question, options, difficulty')
          .eq('tech_stack_id', session.tech_stack_id)
          .eq('difficulty', fb)
          .lt('created_at', cutoffTime)
          .limit(BATCH_SIZE - (questions?.length || 0));

        const excludeIds = [...answeredIds, ...(questions || []).map(q => q.id)];
        if (excludeIds.length > 0) {
          fbQuery = fbQuery.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data: fbQuestions } = await fbQuery;
        questions = [...(questions || []), ...(fbQuestions || [])];
      }
    }

    // Update session difficulty
    if (nextDifficulty !== currentDifficulty || session.questions_answered === 0) {
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
