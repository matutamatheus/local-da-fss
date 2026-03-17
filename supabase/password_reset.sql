-- =============================================
-- Recuperação de senha via WhatsApp
-- =============================================

CREATE TABLE public.password_reset_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  code TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX idx_reset_codes_email ON public.password_reset_codes(email);

-- RLS desabilitado pois será acessado via service role ou sem auth
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Permitir insert e select sem autenticação (para o fluxo de reset)
CREATE POLICY "Inserir codigo reset" ON public.password_reset_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Verificar codigo reset" ON public.password_reset_codes
  FOR SELECT USING (true);

CREATE POLICY "Marcar codigo como usado" ON public.password_reset_codes
  FOR UPDATE USING (true);
