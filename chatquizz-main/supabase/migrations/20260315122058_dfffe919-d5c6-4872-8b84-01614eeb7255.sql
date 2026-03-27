-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_start_node BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create options table
CREATE TABLE public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  next_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

-- Quizzes: owner CRUD
CREATE POLICY "Users can view their own quizzes" ON public.quizzes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create their own quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own quizzes" ON public.quizzes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Questions: owner via quiz
CREATE POLICY "Users can view questions of their quizzes" ON public.questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can create questions in their quizzes" ON public.questions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can update questions in their quizzes" ON public.questions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can delete questions in their quizzes" ON public.questions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));

-- Options: owner via question->quiz
CREATE POLICY "Users can view options of their quizzes" ON public.options FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.questions JOIN public.quizzes ON quizzes.id = questions.quiz_id WHERE questions.id = options.question_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can create options in their quizzes" ON public.options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.questions JOIN public.quizzes ON quizzes.id = questions.quiz_id WHERE questions.id = options.question_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can update options in their quizzes" ON public.options FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.questions JOIN public.quizzes ON quizzes.id = questions.quiz_id WHERE questions.id = options.question_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can delete options in their quizzes" ON public.options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.questions JOIN public.quizzes ON quizzes.id = questions.quiz_id WHERE questions.id = options.question_id AND quizzes.user_id = auth.uid()));

-- Public read access for quiz chat (anyone with the link)
CREATE POLICY "Anyone can view quizzes publicly" ON public.quizzes FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can view questions publicly" ON public.questions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can view options publicly" ON public.options FOR SELECT TO anon USING (true);

-- Indexes
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_options_question_id ON public.options(question_id);
CREATE INDEX idx_quizzes_user_id ON public.quizzes(user_id);