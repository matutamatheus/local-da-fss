-- =============================================
-- Google Calendar Integration
-- =============================================

CREATE TABLE public.google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_google_tokens_user ON public.google_tokens(user_id);

-- Trigger updated_at
CREATE TRIGGER tr_google_tokens_updated
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve proprio token" ON public.google_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Usuario gerencia proprio token" ON public.google_tokens
  FOR ALL USING (user_id = auth.uid());

-- Coluna para guardar o ID do evento no Google Calendar
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS google_event_id TEXT;
