
ALTER TABLE public.quizzes
  ADD COLUMN end_screen_template text NOT NULL DEFAULT 'congrats-green',
  ADD COLUMN end_screen_title text NOT NULL DEFAULT 'Você foi selecionada!',
  ADD COLUMN end_screen_subtitle text NOT NULL DEFAULT 'Sua vaga está garantida',
  ADD COLUMN analysis_title text NOT NULL DEFAULT 'ANALISANDO',
  ADD COLUMN analysis_subtitle text NOT NULL DEFAULT 'Sistema em processamento',
  ADD COLUMN show_analysis_card boolean NOT NULL DEFAULT true,
  ADD COLUMN show_congrats_card boolean NOT NULL DEFAULT true;
