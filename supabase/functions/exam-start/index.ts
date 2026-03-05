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
    const { student_id, tech_stack_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if student already attempted
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (student.attempted) {
      return new Response(JSON.stringify({ error: 'You have already attempted this exam' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check exam schedule
    const { data: schedule } = await supabase
      .from('exam_schedule')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (schedule) {
      const now = new Date();
      const start = new Date(schedule.start_time);
      const end = new Date(schedule.end_time);
      if (now < start || now > end) {
        return new Response(JSON.stringify({ error: 'Exam is not available at this time' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check for existing active session (resume support)
    const { data: existingSession } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('student_id', student_id)
      .eq('is_finished', false)
      .maybeSingle();

    if (existingSession) {
      const elapsed = (Date.now() - new Date(existingSession.start_time).getTime()) / 1000;
      const timeRemaining = Math.max(0, 10 * 60 - elapsed);

      // Fetch theory questions
      const cutoffTime = existingSession.question_cutoff_time || existingSession.start_time;
      const { data: theoryQs } = await supabase
        .from('theory_questions')
        .select('id, question')
        .eq('tech_stack_id', existingSession.tech_stack_id)
        .limit(2);

      return new Response(JSON.stringify({
        session_id: existingSession.id,
        time_remaining: Math.floor(timeRemaining),
        theory_questions: theoryQs || [],
        resumed: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new session
    const questionCutoffTime = schedule ? schedule.start_time : new Date().toISOString();
    const { data: session, error } = await supabase
      .from('exam_sessions')
      .insert({
        student_id,
        tech_stack_id,
        start_time: new Date().toISOString(),
        current_difficulty: 'Easy',
        question_cutoff_time: questionCutoffTime,
      })
      .select()
      .single();

    if (error) throw error;

    // Mark student as attempted
    await supabase
      .from('students')
      .update({ attempted: true })
      .eq('id', student_id);

    // Fetch theory questions
    const { data: theoryQs } = await supabase
      .from('theory_questions')
      .select('id, question')
      .eq('tech_stack_id', tech_stack_id)
      .limit(2);

    return new Response(JSON.stringify({
      session_id: session.id,
      time_remaining: 10 * 60,
      theory_questions: theoryQs || [],
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
