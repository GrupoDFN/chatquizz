
ALTER TABLE public.quiz_shares ADD COLUMN IF NOT EXISTS fulfilled boolean NOT NULL DEFAULT false;
