
CREATE POLICY "Shared user can delete their own shares"
  ON public.quiz_shares FOR DELETE TO authenticated
  USING (shared_with_user_id = auth.uid());
