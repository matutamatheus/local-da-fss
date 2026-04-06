-- =============================================
-- MIGRATION: Storage de PDFs de propostas
-- =============================================

-- Bucket para armazenar PDFs gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas', 'propostas', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
CREATE POLICY "Autenticados fazem upload propostas" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'propostas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados veem propostas" ON storage.objects
  FOR SELECT USING (bucket_id = 'propostas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta propostas" ON storage.objects
  FOR DELETE USING (bucket_id = 'propostas' AND public.is_admin());

-- Adicionar coluna pdf_path na tabela propostas
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS pdf_path TEXT;
