-- Identidade visual e endereco da organizacao
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS cor_primaria text,
  ADD COLUMN IF NOT EXISTS cep          text,
  ADD COLUMN IF NOT EXISTS logradouro   text,
  ADD COLUMN IF NOT EXISTS numero       text,
  ADD COLUMN IF NOT EXISTS bairro       text;

-- Secretaria vinculada ao usuario
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS secretaria_id uuid references secretarias(id) on delete set null;

-- Bucket publico para logos de prefeituras
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152,
  ARRAY['image/png','image/svg+xml','image/jpeg']
) ON CONFLICT (id) DO NOTHING;

-- Politicas de storage (idempotentes via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org_logos_public_read'
  ) THEN
    CREATE POLICY "org_logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'org-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org_logos_auth_write'
  ) THEN
    CREATE POLICY "org_logos_auth_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org_logos_auth_update'
  ) THEN
    CREATE POLICY "org_logos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'org-logos');
  END IF;
END $$;
