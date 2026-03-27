
-- Create a profiles table to look up users by email
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can look up profiles (needed for sharing)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create quiz_shares table
CREATE TABLE public.quiz_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'copy' CHECK (permission IN ('edit', 'copy')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, shared_with_user_id)
);

ALTER TABLE public.quiz_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares
CREATE POLICY "Owner can view shares"
  ON public.quiz_shares FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can insert shares"
  ON public.quiz_shares FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can delete shares"
  ON public.quiz_shares FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Shared user can see shares for them
CREATE POLICY "Shared user can view their shares"
  ON public.quiz_shares FOR SELECT TO authenticated
  USING (shared_with_user_id = auth.uid());

-- Allow shared users (edit mode) to SELECT quizzes shared with them
CREATE POLICY "Shared users can view shared quizzes"
  ON public.quizzes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = quizzes.id
      AND quiz_shares.shared_with_user_id = auth.uid()
    )
  );

-- Allow shared users (edit mode) to UPDATE quizzes shared with edit permission
CREATE POLICY "Shared users can edit shared quizzes"
  ON public.quizzes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = quizzes.id
      AND quiz_shares.shared_with_user_id = auth.uid()
      AND quiz_shares.permission = 'edit'
    )
  );

-- Allow shared users (edit) to manage questions in shared quizzes
CREATE POLICY "Shared users can view questions of shared quizzes"
  ON public.questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = questions.quiz_id
      AND quiz_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can create questions in shared quizzes"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = questions.quiz_id
      AND quiz_shares.shared_with_user_id = auth.uid()
      AND quiz_shares.permission = 'edit'
    )
  );

CREATE POLICY "Shared users can update questions in shared quizzes"
  ON public.questions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = questions.quiz_id
      AND quiz_shares.shared_with_user_id = auth.uid()
      AND quiz_shares.permission = 'edit'
    )
  );

CREATE POLICY "Shared users can delete questions in shared quizzes"
  ON public.questions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares
      WHERE quiz_shares.quiz_id = questions.quiz_id
      AND quiz_shares.shared_with_user_id = auth.uid()
      AND quiz_shares.permission = 'edit'
    )
  );

-- Allow shared users (edit) to manage options in shared quizzes
CREATE POLICY "Shared users can view options of shared quizzes"
  ON public.options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares qs
      JOIN public.questions q ON q.quiz_id = qs.quiz_id
      WHERE q.id = options.question_id
      AND qs.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can create options in shared quizzes"
  ON public.options FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_shares qs
      JOIN public.questions q ON q.quiz_id = qs.quiz_id
      WHERE q.id = options.question_id
      AND qs.shared_with_user_id = auth.uid()
      AND qs.permission = 'edit'
    )
  );

CREATE POLICY "Shared users can update options in shared quizzes"
  ON public.options FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares qs
      JOIN public.questions q ON q.quiz_id = qs.quiz_id
      WHERE q.id = options.question_id
      AND qs.shared_with_user_id = auth.uid()
      AND qs.permission = 'edit'
    )
  );

CREATE POLICY "Shared users can delete options in shared quizzes"
  ON public.options FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_shares qs
      JOIN public.questions q ON q.quiz_id = qs.quiz_id
      WHERE q.id = options.question_id
      AND qs.shared_with_user_id = auth.uid()
      AND qs.permission = 'edit'
    )
  );
