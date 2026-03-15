
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_copy boolean NOT NULL DEFAULT false;
