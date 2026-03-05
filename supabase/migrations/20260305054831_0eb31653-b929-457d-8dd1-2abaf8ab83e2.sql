
-- Create difficulty enum
CREATE TYPE public.difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- Create tier enum
CREATE TYPE public.tier_level AS ENUM ('P1', 'P2', 'P3');

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  attempted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students are readable by anon for login" ON public.students FOR SELECT USING (true);
CREATE POLICY "Students can be updated" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Students can be inserted" ON public.students FOR INSERT WITH CHECK (true);

-- Tech Stacks table
CREATE TABLE public.tech_stacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tech_stacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tech stacks readable by all" ON public.tech_stacks FOR SELECT USING (true);
CREATE POLICY "Tech stacks insertable" ON public.tech_stacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Tech stacks deletable" ON public.tech_stacks FOR DELETE USING (true);

-- Questions table (MCQ)
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tech_stack_id UUID NOT NULL REFERENCES public.tech_stacks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'Easy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions readable" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Questions insertable" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Questions deletable" ON public.questions FOR DELETE USING (true);

-- Theory Questions table
CREATE TABLE public.theory_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tech_stack_id UUID NOT NULL REFERENCES public.tech_stacks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.theory_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Theory questions readable" ON public.theory_questions FOR SELECT USING (true);
CREATE POLICY "Theory questions insertable" ON public.theory_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Theory questions deletable" ON public.theory_questions FOR DELETE USING (true);

-- Exam Sessions table
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tech_stack_id UUID NOT NULL REFERENCES public.tech_stacks(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  violations INTEGER NOT NULL DEFAULT 0,
  current_difficulty difficulty_level NOT NULL DEFAULT 'Easy',
  questions_answered INTEGER NOT NULL DEFAULT 0,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exam sessions readable" ON public.exam_sessions FOR SELECT USING (true);
CREATE POLICY "Exam sessions insertable" ON public.exam_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Exam sessions updatable" ON public.exam_sessions FOR UPDATE USING (true);

-- Responses table (MCQ answers)
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_taken INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Responses readable" ON public.responses FOR SELECT USING (true);
CREATE POLICY "Responses insertable" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Responses updatable" ON public.responses FOR UPDATE USING (true);

-- Theory Responses table
CREATE TABLE public.theory_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.theory_questions(id) ON DELETE CASCADE,
  answer_text TEXT DEFAULT '',
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.theory_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Theory responses readable" ON public.theory_responses FOR SELECT USING (true);
CREATE POLICY "Theory responses insertable" ON public.theory_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Theory responses updatable" ON public.theory_responses FOR UPDATE USING (true);

-- Results table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tech_stack_id UUID NOT NULL REFERENCES public.tech_stacks(id) ON DELETE CASCADE,
  mcq_score NUMERIC NOT NULL DEFAULT 0,
  theory_score NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  assigned_tier tier_level NOT NULL DEFAULT 'P3',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results readable" ON public.results FOR SELECT USING (true);
CREATE POLICY "Results insertable" ON public.results FOR INSERT WITH CHECK (true);
CREATE POLICY "Results updatable" ON public.results FOR UPDATE USING (true);

-- Exam Schedule table
CREATE TABLE public.exam_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedule readable by all" ON public.exam_schedule FOR SELECT USING (true);
CREATE POLICY "Schedule insertable" ON public.exam_schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Schedule updatable" ON public.exam_schedule FOR UPDATE USING (true);
CREATE POLICY "Schedule deletable" ON public.exam_schedule FOR DELETE USING (true);

-- Admins table (simple admin with password)
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins readable for login" ON public.admins FOR SELECT USING (true);

-- Insert default tech stacks
INSERT INTO public.tech_stacks (name) VALUES
  ('MERN'),
  ('Kotlin and Android Development'),
  ('SwiftUI and iOS Development'),
  ('Flutter'),
  ('PHP and Laravel'),
  ('DotNet'),
  ('DevOps and AWS Cloud'),
  ('Networking'),
  ('Vue.js'),
  ('React'),
  ('Node.js'),
  ('GenAI'),
  ('Django');

-- Insert default admin (password: admin123)
INSERT INTO public.admins (username, password_hash) VALUES
  ('admin', 'admin123');
