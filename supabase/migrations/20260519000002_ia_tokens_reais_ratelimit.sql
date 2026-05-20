-- supabase/migrations/20260519000002_ia_tokens_reais_ratelimit.sql

-- 1. Colunas de token real em acoes_ia
ALTER TABLE acoes_ia
  ADD COLUMN IF NOT EXISTS tokens_entrada_real integer,
  ADD COLUMN IF NOT EXISTS tokens_saida_real   integer,
  ADD COLUMN IF NOT EXISTS chars_entrada        integer,
  ADD COLUMN IF NOT EXISTS chars_saida          integer;

-- Migrar valores existentes para chars (retrocompatibilidade)
UPDATE acoes_ia
SET chars_entrada = tokens_entrada,
    chars_saida   = tokens_saida
WHERE chars_entrada IS NULL;

-- 2. Rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  escopo          text NOT NULL CHECK (escopo IN ('org','user','global')),
  perfil          text NOT NULL CHECK (perfil IN ('conservador','padrao','intenso','personalizado')) DEFAULT 'padrao',
  max_chamadas    integer NOT NULL DEFAULT 60,
  janela_segundos integer NOT NULL DEFAULT 3600,
  modo            text NOT NULL CHECK (modo IN ('fixo','adaptativo')) DEFAULT 'adaptativo',
  ativo           boolean DEFAULT true,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_janelas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave          text NOT NULL,
  chamadas       integer DEFAULT 0,
  janela_inicio  timestamptz NOT NULL,
  ultimo_ip      text,
  ips_detectados text[] DEFAULT '{}',
  anomalia_flag  boolean DEFAULT false,
  atualizado_em  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_janelas_chave
  ON rate_limit_janelas (chave, janela_inicio);

-- 3. Registro de reuso de clausulas
CREATE TABLE IF NOT EXISTS clausulas_aplicadas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  clausula_id          uuid REFERENCES clausulas_aprendidas(id) ON DELETE SET NULL,
  processo_id          uuid REFERENCES processos_licitatorios(id) ON DELETE SET NULL,
  acao_ia_id           uuid REFERENCES acoes_ia(id) ON DELETE SET NULL,
  tokens_economizados  integer DEFAULT 0,
  modo                 text CHECK (modo IN ('contexto','validacao')),
  criado_em            timestamptz DEFAULT now()
);

-- 4. Full-text search em clausulas_aprendidas
ALTER TABLE clausulas_aprendidas
  ADD COLUMN IF NOT EXISTS busca_tsvector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(texto_aprovado, '') || ' ' ||
        coalesce(tipo_campo, '') || ' ' ||
        coalesce(categoria_objeto, '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_clausulas_tsvector
  ON clausulas_aprendidas USING GIN (busca_tsvector);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clausulas_trgm
  ON clausulas_aprendidas USING GIN (texto_aprovado gin_trgm_ops);

-- 5. RLS
ALTER TABLE rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_janelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clausulas_aplicadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_configs_org" ON rate_limit_configs
  FOR ALL USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- janelas: acesso via service role apenas (server-side)
-- service role bypassa RLS por definicao; usuarios comuns nao devem acessar diretamente
CREATE POLICY "rate_limit_janelas_deny_users" ON rate_limit_janelas
  FOR ALL USING (false);

CREATE POLICY "clausulas_aplicadas_org" ON clausulas_aplicadas
  FOR ALL USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
