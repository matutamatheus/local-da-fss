-- =============================================
-- MIGRATION: Audit Log — Local da FSS
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_nome TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Autenticados criam audit log" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- MIGRATION: Bloqueios internos de calendário
-- =============================================

CREATE TABLE public.bloqueios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'Manutenção',
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_datas_bloqueio CHECK (data_fim >= data_inicio)
);

CREATE INDEX idx_bloqueios_datas ON public.bloqueios(data_inicio, data_fim);

ALTER TABLE public.bloqueios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem bloqueios" ON public.bloqueios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia bloqueios" ON public.bloqueios
  FOR ALL USING (public.is_admin());
