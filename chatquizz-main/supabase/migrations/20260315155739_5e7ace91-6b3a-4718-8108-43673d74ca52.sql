
-- 1. Criar tabela de audit log
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Apenas admins podem ver os logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Ninguém pode deletar/atualizar logs (imutável)
-- (sem policies de INSERT/UPDATE/DELETE para authenticated = bloqueado por RLS)

-- 5. Função para registrar no audit log (security definer para bypass RLS)
CREATE OR REPLACE FUNCTION public.audit_log_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Triggers de audit nas tabelas principais
CREATE TRIGGER audit_quizzes
  AFTER INSERT OR UPDATE OR DELETE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_action();

CREATE TRIGGER audit_questions
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_action();

CREATE TRIGGER audit_options
  AFTER INSERT OR UPDATE OR DELETE ON public.options
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_action();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_action();
