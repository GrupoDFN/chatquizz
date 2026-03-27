
ALTER TABLE public.quizzes ADD COLUMN slug text UNIQUE;

-- Generate default slugs for existing quizzes based on title
UPDATE public.quizzes SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 6);

-- Create index for fast slug lookups
CREATE INDEX idx_quizzes_slug ON public.quizzes(slug);
