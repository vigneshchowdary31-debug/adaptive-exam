-- Add question_cutoff_time column to exam_sessions
ALTER TABLE public.exam_sessions ADD COLUMN question_cutoff_time TIMESTAMP WITH TIME ZONE;

-- Update existing sessions to set question_cutoff_time to start_time if null
UPDATE public.exam_sessions SET question_cutoff_time = start_time WHERE question_cutoff_time IS NULL;

-- Make it not null
ALTER TABLE public.exam_sessions ALTER COLUMN question_cutoff_time SET NOT NULL;