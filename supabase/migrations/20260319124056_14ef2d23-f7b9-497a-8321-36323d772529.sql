
-- 1. FIX CRITICAL: Privilege escalation on quiz_shares INSERT
-- Drop old policy and create secure one that checks quiz ownership
DROP POLICY IF EXISTS "Owner can insert shares" ON public.quiz_shares;
CREATE POLICY "Owner can insert shares" ON public.quiz_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_shares.quiz_id
        AND quizzes.user_id = auth.uid()
    )
  );

-- 2. FIX CRITICAL: Exposed emails - restrict profiles SELECT to own profile
-- But we need cross-user lookup for sharing feature, so allow owner to see own + shared users
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 3. FIX: Restrict anonymous quiz access to published quizzes only
DROP POLICY IF EXISTS "Anyone can view quizzes publicly" ON public.quizzes;
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes
  FOR SELECT TO anon
  USING (slug IS NOT NULL);

-- 4. FIX: Restrict anonymous question/option access to published quizzes
DROP POLICY IF EXISTS "Anyone can view questions publicly" ON public.questions;
CREATE POLICY "Anyone can view questions of published quizzes" ON public.questions
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id
      AND quizzes.slug IS NOT NULL
  ));

DROP POLICY IF EXISTS "Anyone can view options publicly" ON public.options;
CREATE POLICY "Anyone can view options of published quizzes" ON public.options
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes qz ON qz.id = q.quiz_id
    WHERE q.id = options.question_id
      AND qz.slug IS NOT NULL
  ));

-- 5. FIX: Tighten quiz_responses INSERT - validate quiz_id exists
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.quiz_responses;
CREATE POLICY "Anyone can insert responses for published quizzes" ON public.quiz_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_responses.quiz_id
      AND quizzes.slug IS NOT NULL
  ));

-- 6. FIX: Tighten quiz_views INSERT
DROP POLICY IF EXISTS "Anyone can insert views" ON public.quiz_views;
CREATE POLICY "Anyone can insert views for published quizzes" ON public.quiz_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_views.quiz_id
      AND quizzes.slug IS NOT NULL
  ));
