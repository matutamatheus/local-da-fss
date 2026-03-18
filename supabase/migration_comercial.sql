-- =============================================
-- MIGRATION: Módulo Comercial — Local da FSS
-- =============================================

-- 1. ATUALIZAR CHECK CONSTRAINT DE ROLES
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'solicitante', 'comercial', 'parceiro'));

-- 2. FUNÇÃO HELPER PARA COMERCIAL (acesso inclui admin + comercial)
CREATE OR REPLACE FUNCTION public.is_comercial()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'comercial')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- 3. CRM ETAPAS (colunas do Kanban)
-- =============================================
CREATE TABLE public.crm_etapas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver etapas CRM" ON public.crm_etapas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia etapas CRM" ON public.crm_etapas
  FOR ALL USING (public.is_admin());

INSERT INTO public.crm_etapas (nome, cor, ordem) VALUES
  ('Leads',                     '#6b7280', 1),
  ('Contato Feito',             '#2563eb', 2),
  ('Proposta Enviada',          '#f59e0b', 3),
  ('Negociação',                '#8b5cf6', 4),
  ('Pré-reserva',               '#0891b2', 5),
  ('Agendado',                  '#16a34a', 6),
  ('Pós-evento / Recorrência',  '#10b981', 7),
  ('Fechado - Perdido',         '#dc2626', 8);

-- =============================================
-- 4. CLIENTES
-- =============================================
CREATE TABLE public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  site TEXT,
  empresa TEXT,
  cliente_full_sales BOOLEAN NOT NULL DEFAULT FALSE,
  produto TEXT CHECK (produto IN ('ia_full_sales', 'high_sales', 'aceleracao', 'ativacao', 'outro') OR produto IS NULL),
  proximo_evento_1 DATE,
  proximo_evento_1_pessoas INTEGER,
  proximo_evento_2 DATE,
  proximo_evento_2_pessoas INTEGER,
  observacoes TEXT,
  crm_etapa_id UUID REFERENCES public.crm_etapas(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_nome ON public.clientes(nome);
CREATE INDEX idx_clientes_etapa ON public.clientes(crm_etapa_id);
CREATE INDEX idx_clientes_criado_por ON public.clientes(criado_por);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem clientes" ON public.clientes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam cliente" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados editam cliente" ON public.clientes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta cliente" ON public.clientes
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER tr_clientes_updated
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 5. REGRAS DE DIÁRIAS (por dia da semana)
-- =============================================
CREATE TABLE public.regras_diarias (
  dia_semana INTEGER PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
  nome_dia TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL DEFAULT 40000.00,
  minimo_diarias INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.regras_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem regras diarias" ON public.regras_diarias
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia regras diarias" ON public.regras_diarias
  FOR ALL USING (public.is_admin());

-- 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
INSERT INTO public.regras_diarias (dia_semana, nome_dia, valor, minimo_diarias) VALUES
  (0, 'Domingo',   50000.00, 2),
  (1, 'Segunda',   40000.00, 1),
  (2, 'Terça',     40000.00, 1),
  (3, 'Quarta',    40000.00, 1),
  (4, 'Quinta',    40000.00, 1),
  (5, 'Sexta',     45000.00, 2),
  (6, 'Sábado',    55000.00, 2);

-- =============================================
-- 6. REGRAS COMERCIAIS (singleton, editável pelo admin)
-- =============================================
CREATE TABLE public.regras_comerciais (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  desconto_max_gestor DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  regras_texto TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.regras_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem regras comerciais" ON public.regras_comerciais
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia regras comerciais" ON public.regras_comerciais
  FOR ALL USING (public.is_admin());

INSERT INTO public.regras_comerciais (desconto_max_gestor, regras_texto)
VALUES (10.00, 'REGRAS COMERCIAIS — FULL SALES

1. A reserva somente é confirmada após o pagamento do sinal (30% do valor total).
2. O pagamento integral deve ser realizado com 48h de antecedência ao evento.
3. Cancelamentos com mais de 30 dias de antecedência: reembolso de 90% do sinal.
4. Cancelamentos entre 15 e 30 dias: reembolso de 50% do sinal.
5. Cancelamentos com menos de 15 dias: sem reembolso do sinal.
6. O locatário é responsável por qualquer dano ao patrimônio do espaço.
7. Capacidade máxima do espaço deve ser respeitada.
8. Não é permitido fumar nas dependências internas.');

-- =============================================
-- 7. MULTIPLICADORES POR OCUPAÇÃO MENSAL
-- =============================================
CREATE TABLE public.multiplicadores_ocupacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faixa_min INTEGER NOT NULL,
  faixa_max INTEGER NOT NULL,
  multiplicador DECIMAL(4, 2) NOT NULL CHECK (multiplicador BETWEEN 0.50 AND 2.00),
  ordem INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.multiplicadores_ocupacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem mult ocupacao" ON public.multiplicadores_ocupacao
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia mult ocupacao" ON public.multiplicadores_ocupacao
  FOR ALL USING (public.is_admin());

INSERT INTO public.multiplicadores_ocupacao (faixa_min, faixa_max, multiplicador, ordem) VALUES
  (0,  20,  0.85, 1),
  (21, 60,  1.00, 2),
  (61, 80,  1.10, 3),
  (81, 100, 1.20, 4);

-- =============================================
-- 8. MULTIPLICADORES POR PROXIMIDADE
-- =============================================
CREATE TABLE public.multiplicadores_proximidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dias_min INTEGER NOT NULL DEFAULT 0,
  dias_max INTEGER,
  multiplicador DECIMAL(4, 2) NOT NULL CHECK (multiplicador BETWEEN 0.50 AND 2.00),
  label TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.multiplicadores_proximidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem mult proximidade" ON public.multiplicadores_proximidade
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin gerencia mult proximidade" ON public.multiplicadores_proximidade
  FOR ALL USING (public.is_admin());

INSERT INTO public.multiplicadores_proximidade (dias_min, dias_max, multiplicador, label, ordem) VALUES
  (121, NULL, 0.85, '+120 dias',        1),
  (91,  120,  0.95, '91 a 120 dias',   2),
  (30,  90,   1.00, '30 a 90 dias',    3),
  (0,   29,   1.15, 'Menos de 30 dias', 4);

-- =============================================
-- 9. RESERVAS
-- =============================================
CREATE TABLE public.reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  espaco_id UUID REFERENCES public.espacos(id) ON DELETE SET NULL,
  data_entrada DATE NOT NULL,
  data_saida DATE NOT NULL,
  num_participantes INTEGER NOT NULL DEFAULT 1,
  audiovisual BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'pre_reservada', 'agendada', 'cancelada')),
  valor_diaria DECIMAL(10, 2),
  valor_total DECIMAL(10, 2),
  desconto_aplicado DECIMAL(5, 2) NOT NULL DEFAULT 0,
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_datas_reserva CHECK (data_saida >= data_entrada)
);

CREATE INDEX idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX idx_reservas_status ON public.reservas(status);
CREATE INDEX idx_reservas_datas ON public.reservas(data_entrada, data_saida);

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem reservas" ON public.reservas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam reserva" ON public.reservas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados editam reserva" ON public.reservas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta reserva" ON public.reservas
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER tr_reservas_updated
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 10. PROPOSTAS
-- =============================================
CREATE TABLE public.propostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id UUID REFERENCES public.reservas(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  descritivo TEXT NOT NULL DEFAULT '',
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_propostas_reserva ON public.propostas(reserva_id);
CREATE INDEX idx_propostas_cliente ON public.propostas(cliente_id);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem propostas" ON public.propostas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam proposta" ON public.propostas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados editam proposta" ON public.propostas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta proposta" ON public.propostas
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER tr_propostas_updated
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
