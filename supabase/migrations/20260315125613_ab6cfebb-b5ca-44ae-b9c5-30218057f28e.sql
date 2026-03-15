ALTER TABLE public.quizzes ADD COLUMN avatar_url text DEFAULT NULL;
ALTER TABLE public.quizzes ADD COLUMN show_verified_badge boolean NOT NULL DEFAULT true;

INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-avatars', 'quiz-avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'quiz-avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quiz-avatars');
CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'quiz-avatars');
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'quiz-avatars');