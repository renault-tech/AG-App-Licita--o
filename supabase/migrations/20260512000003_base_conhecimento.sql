-- ============================================================
-- Base de Conhecimento: documentos de referencia para aprendizado da IA
-- Tabela documentos_base: arquivos enviados pelo admin_plataforma
-- Tabela clausulas_aplicadas: rastreamento de reuso de clausulas (economia de tokens)
-- ============================================================

-- Tabela principal dos documentos enviados pelo admin para alimentar a base de conhecimento
CREATE TABLE documentos_base (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por       uuid NOT NULL REFERENCES usuarios(id),
  titulo           text NOT NULL,
  descricao        text,
  tipo_documento   text NOT NULL CHECK (tipo_documento IN ('dfd','etp','tr','edital','parecer','mapa_riscos','geral')),
  modalidade       text,
  storage_path     text NOT NULL,
  formato          text NOT NULL CHECK (formato IN ('pdf','docx','txt')),
  tamanho_bytes    integer,
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','analisando','processado','erro')),
  conteudo_extraido text,
  clausulas_count  integer DEFAULT 0,
  erro_mensagem    text,
  processado_em    timestamptz,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documentos_base ENABLE ROW LEVEL SECURITY;

-- Somente admin_plataforma acessa documentos_base
CREATE POLICY "admin_plataforma_documentos_base" ON documentos_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND papel = 'admin_plataforma'
    )
  );

-- Rastreamento de reuso de clausulas aprendidas/padrao (evita chamada a IA)
CREATE TABLE clausulas_aplicadas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clausula_id         uuid NOT NULL,
  clausula_tipo       text NOT NULL CHECK (clausula_tipo IN ('padrao', 'aprendida')),
  processo_id         uuid REFERENCES processos_licitatorios(id) ON DELETE SET NULL,
  organizacao_id      uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo_documento      text NOT NULL,
  tipo_campo          text NOT NULL,
  tokens_economizados integer NOT NULL DEFAULT 500,
  aplicado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clausulas_aplicadas_org ON clausulas_aplicadas(organizacao_id, tipo_documento);
CREATE INDEX idx_clausulas_aplicadas_processo ON clausulas_aplicadas(processo_id);

ALTER TABLE clausulas_aplicadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own_clausulas_aplicadas" ON clausulas_aplicadas
  FOR ALL USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

-- Adicionar rastreamento de fonte e documento de origem em clausulas_padrao
ALTER TABLE clausulas_padrao
  ADD COLUMN IF NOT EXISTS fonte text DEFAULT 'manual'
    CHECK (fonte IN ('manual', 'upload_admin', 'ia_sugestao')),
  ADD COLUMN IF NOT EXISTS documento_base_id uuid REFERENCES documentos_base(id) ON DELETE SET NULL;

-- Adicionar custo real e secao que acionou a IA em acoes_ia
ALTER TABLE acoes_ia
  ADD COLUMN IF NOT EXISTS custo_centavos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secao_nome text;