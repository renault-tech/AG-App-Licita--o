-- supabase/migrations/20260512000006_procuradoria.sql

-- 1. New table: configuracoes_plataforma
CREATE TABLE IF NOT EXISTS configuracoes_plataforma (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave       text NOT NULL UNIQUE,
  valor       text NOT NULL,
  descricao   text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES usuarios(id)
);

-- Seed default values
INSERT INTO configuracoes_plataforma (chave, valor, descricao)
VALUES
  ('prazo_urgencia_parecer_dias', '5',  'Dias sem parecer para badge URGENTE'),
  ('prazo_alerta_parecer_dias',   '10', 'Dias sem parecer para badge ATENCAO')
ON CONFLICT (chave) DO NOTHING;

-- RLS: all authenticated users can read; only admin_plataforma can write
ALTER TABLE configuracoes_plataforma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_autenticados" ON configuracoes_plataforma;
CREATE POLICY "leitura_autenticados" ON configuracoes_plataforma
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "escrita_admin_plataforma" ON configuracoes_plataforma;
CREATE POLICY "escrita_admin_plataforma" ON configuracoes_plataforma
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.papel = 'admin_plataforma'
    )
  );

-- 2. Extend pareceres table
ALTER TABLE pareceres
  ADD COLUMN IF NOT EXISTS veredito           text CHECK (veredito IN ('aprovar','aprovar_com_ressalvas','contrario')),
  ADD COLUMN IF NOT EXISTS analise_ia         text,
  ADD COLUMN IF NOT EXISTS ressalvas          text,
  ADD COLUMN IF NOT EXISTS motivo_contrario   text,
  ADD COLUMN IF NOT EXISTS data_envio_procuradoria timestamptz;

-- Backfill data_envio_procuradoria for existing rows
UPDATE pareceres SET data_envio_procuradoria = created_at WHERE data_envio_procuradoria IS NULL;

-- 3. Extend status_parecer enum (Postgres requires specific syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'em_analise'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_parecer')
  ) THEN
    ALTER TYPE status_parecer ADD VALUE 'em_analise' BEFORE 'aprovado';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'contrario'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_parecer')
  ) THEN
    ALTER TYPE status_parecer ADD VALUE 'contrario' AFTER 'aprovado_com_ressalvas';
  END IF;
END$$;

-- 4. Extend organizacoes table
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS participa_pool_precedentes boolean NOT NULL DEFAULT false;

-- 5. New table: pareceres_precedentes
CREATE TABLE IF NOT EXISTS pareceres_precedentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parecer_id      uuid NOT NULL REFERENCES pareceres(id) ON DELETE CASCADE,
  organizacao_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  objeto_keywords text[],
  modalidade      text,
  faixa_valor     text,
  veredito        text NOT NULL,
  procurador_id   uuid REFERENCES usuarios(id),
  emitido_em      timestamptz NOT NULL DEFAULT now(),
  participa_pool  boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_precedentes_keywords
  ON pareceres_precedentes USING gin(objeto_keywords);
CREATE INDEX IF NOT EXISTS idx_precedentes_modalidade
  ON pareceres_precedentes(modalidade, faixa_valor);

-- RLS: org reads its own + pool entries
ALTER TABLE pareceres_precedentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_precedentes" ON pareceres_precedentes;
CREATE POLICY "leitura_precedentes" ON pareceres_precedentes
  FOR SELECT TO authenticated
  USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
    OR participa_pool = true
  );

DROP POLICY IF EXISTS "insercao_propria_org" ON pareceres_precedentes;
CREATE POLICY "insercao_propria_org" ON pareceres_precedentes
  FOR INSERT TO authenticated
  WITH CHECK (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
