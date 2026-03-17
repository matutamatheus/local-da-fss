-- =============================================
-- Local da FSS - Schema do Banco de Dados
-- =============================================

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'solicitante' CHECK (role IN ('admin', 'solicitante')),
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de espaços
CREATE TABLE public.espacos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL DEFAULT '',
  capacidade INTEGER NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de solicitações/eventos
CREATE TABLE public.solicitacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  espaco_id UUID REFERENCES public.espacos(id) ON DELETE SET NULL,
  solicitante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  num_participantes INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  recursos_adicionais TEXT,
  observacoes TEXT,
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de anexos (arquivos de mídia)
CREATE TABLE public.anexos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  tamanho BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de convites de registro
CREATE TABLE public.convites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_por UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- =============================================
-- Índices
-- =============================================
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX idx_solicitacoes_solicitante ON public.solicitacoes(solicitante_id);
CREATE INDEX idx_solicitacoes_data ON public.solicitacoes(data_inicio);
CREATE INDEX idx_anexos_solicitacao ON public.anexos(solicitacao_id);
CREATE INDEX idx_convites_token ON public.convites(token);

-- =============================================
-- Trigger para updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_solicitacoes_updated
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar admin (SECURITY DEFINER evita recursão no RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: usuários veem seu próprio perfil, admin vê todos
CREATE POLICY "Usuarios veem proprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Usuarios atualizam proprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Inserir perfil no registro" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Espaços: todos logados podem ver, admin pode modificar
CREATE POLICY "Todos veem espacos" ON public.espacos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia espacos" ON public.espacos
  FOR ALL USING (public.is_admin());

-- Solicitações: solicitante vê as suas, admin vê todas
CREATE POLICY "Solicitante ve suas solicitacoes" ON public.solicitacoes
  FOR SELECT USING (solicitante_id = auth.uid() OR public.is_admin());

CREATE POLICY "Solicitante cria solicitacao" ON public.solicitacoes
  FOR INSERT WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "Solicitante edita pendente" ON public.solicitacoes
  FOR UPDATE USING (
    (solicitante_id = auth.uid() AND status = 'pendente') OR public.is_admin()
  );

CREATE POLICY "Admin deleta solicitacao" ON public.solicitacoes
  FOR DELETE USING (public.is_admin());

-- Anexos: mesmas regras da solicitação pai
CREATE POLICY "Ver anexos da solicitacao" ON public.anexos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id
      AND (s.solicitante_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Inserir anexo" ON public.anexos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid()
    )
  );

CREATE POLICY "Deletar anexo" ON public.anexos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id
      AND (s.solicitante_id = auth.uid() OR public.is_admin())
    )
  );

-- Convites: só admin
CREATE POLICY "Admin gerencia convites" ON public.convites
  FOR ALL USING (public.is_admin());

CREATE POLICY "Verificar convite no registro" ON public.convites
  FOR SELECT USING (true);

-- =============================================
-- Storage bucket para anexos
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos', 'anexos', false);

CREATE POLICY "Usuarios autenticados fazem upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Ver arquivos de anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta arquivos" ON storage.objects
  FOR DELETE USING (bucket_id = 'anexos' AND public.is_admin());

-- =============================================
-- Trigger: criar perfil ao registrar
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'solicitante')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Dados iniciais: espaço padrão
-- =============================================
INSERT INTO public.espacos (nome, localizacao, capacidade, descricao)
VALUES ('Sala de Eventos FSS', 'FSS', 100, 'Sala principal de eventos da FSS');
