import { supabase } from '@/integrations/supabase/client';

async function callFunction(name: string, body?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body || {},
  });
  if (error) throw error;
  return data;
}

// Student APIs
export async function studentLogin(studentId: string) {
  return callFunction('student-login', { student_id: studentId });
}

export async function getTechStacks() {
  const { data, error } = await supabase.from('tech_stacks').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function startExam(studentId: string, techStackId: string) {
  return callFunction('exam-start', { student_id: studentId, tech_stack_id: techStackId });
}

export async function getNextBatch(sessionId: string) {
  return callFunction('exam-next-batch', { session_id: sessionId });
}

export async function submitAnswer(sessionId: string, questionId: string, selectedOption: string) {
  return callFunction('exam-submit-answer', {
    session_id: sessionId,
    question_id: questionId,
    selected_option: selectedOption,
  });
}

export async function submitTheory(sessionId: string, questionId: string, answerText: string) {
  return callFunction('exam-submit-theory', {
    session_id: sessionId,
    question_id: questionId,
    answer_text: answerText,
  });
}

export async function finishExam(sessionId: string) {
  return callFunction('exam-finish', { session_id: sessionId });
}

export async function getExamStatus(sessionId: string) {
  return callFunction('exam-status', { session_id: sessionId });
}

// Admin APIs
export async function adminLogin(username: string, password: string) {
  return callFunction('admin-login', { username, password });
}

export async function scheduleExam(startTime: string, endTime: string) {
  return callFunction('admin-schedule-exam', { start_time: startTime, end_time: endTime });
}

export async function addTechStack(name: string) {
  const { data, error } = await supabase.from('tech_stacks').insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function removeTechStack(id: string) {
  const { error } = await supabase.from('tech_stacks').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadQuestions(techStackId: string, questions: unknown[], theoryQuestions: unknown[]) {
  return callFunction('admin-upload-questions', {
    tech_stack_id: techStackId,
    questions,
    theory_questions: theoryQuestions,
  });
}

export async function getResults(techStackFilter?: string) {
  let query = supabase
    .from('results')
    .select(`*, students!inner(student_id, name), tech_stacks!inner(name)`)
    .order('created_at', { ascending: false });

  if (techStackFilter) {
    query = query.eq('tech_stack_id', techStackFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getExamSchedule() {
  const { data, error } = await supabase
    .from('exam_schedule')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addStudents(students: { student_id: string; name: string }[]) {
  const { data, error } = await supabase.from('students').insert(students).select();
  if (error) throw error;
  return data;
}

