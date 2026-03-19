
-- Fix: Shared users can steal quiz ownership by changing user_id
DROP POLICY IF EXISTS "Shared users can edit shared quizzes" ON public.quizzes;
CREATE POLICY "Shared users can edit shared quizzes" ON public.quizzes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quiz_shares
    WHERE quiz_shares.quiz_id = quizzes.id
      AND quiz_shares.shared_with_user_id = auth.uid()
      AND quiz_shares.permission = 'edit'
  ))
  WITH CHECK (
    user_id = (SELECT q.user_id FROM public.quizzes q WHERE q.id = quizzes.id)
    AND EXISTS (
      SELECT 1 FROM quiz_shares
      WHERE quiz_shares.quiz_id = quizzes.id
        AND quiz_shares.shared_with_user_id = auth.uid()
        AND quiz_shares.permission = 'edit'
    )
  );
