-- Adicionar coluna role na tabela de convites
ALTER TABLE public.convites
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'solicitante'
  CHECK (role IN ('admin', 'solicitante', 'comercial', 'parceiro'));
