-- supabase/migrations/20260518000007_organizacoes_especiais.sql
-- ============================================================
-- Adiciona flags especiais para organizacoes de sistema
-- is_cataguases: org real usada para desenvolvimento pelo Admin Master
-- is_demo: org ficticia para demonstracao comercial
-- ============================================================

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS is_cataguases boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demo       boolean NOT NULL DEFAULT false;

-- Garante unicidade: apenas uma org pode ser cataguases e uma pode ser demo
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_cataguases_unica ON organizacoes(is_cataguases) WHERE is_cataguases = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_demo_unica       ON organizacoes(is_demo)       WHERE is_demo = true;

-- Cria a prefeitura demo (se nao existir)
INSERT INTO organizacoes (
  nome, cnpj, municipio, estado, ativo, is_demo,
  cabecalho_institucional
)
SELECT
  'Prefeitura Demo — LicitaIA',
  '00000000000000',
  'Cidade Demo',
  'BR',
  true,
  true,
  'PREFEITURA MUNICIPAL DE CIDADE DEMO — Plataforma LicitaIA Demo'
WHERE NOT EXISTS (
  SELECT 1 FROM organizacoes WHERE is_demo = true
);
