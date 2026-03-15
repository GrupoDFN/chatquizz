
-- Table for anonymous session tracking
CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.options(id) ON DELETE SET NULL,
  step_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast quiz-level queries
CREATE INDEX idx_quiz_responses_quiz_id ON public.quiz_responses(quiz_id);
CREATE INDEX idx_quiz_responses_session_id ON public.quiz_responses(session_id);

-- Track quiz views (when someone opens the quiz)
CREATE TABLE public.quiz_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_views_quiz_id ON public.quiz_views(quiz_id);

-- Enable RLS
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_views ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can INSERT responses/views (public quiz interaction)
CREATE POLICY "Anyone can insert responses" ON public.quiz_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can insert views" ON public.quiz_views FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only quiz owner can SELECT responses/views
CREATE POLICY "Quiz owner can view responses" ON public.quiz_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_responses.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Quiz owner can view views" ON public.quiz_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_views.quiz_id AND quizzes.user_id = auth.uid()));
