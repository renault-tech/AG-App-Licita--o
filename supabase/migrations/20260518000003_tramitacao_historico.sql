-- supabase/migrations/20260518000003_tramitacao_historico.sql
-- ============================================================
-- Historico de tramitacao por processo
-- Registra cada mudanca de fase (avanco e devolucao)
-- Conforme Secao 3 do spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

CREATE TABLE tramitacao_historico (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     uuid          NOT NULL REFERENCES processos_licitatorios(id) ON DELETE CASCADE,
  organizacao_id  uuid          NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid          NOT NULL REFERENCES auth.users(id),
  nome_usuario    text          NOT NULL,
  de_papel        papel_usuario NOT NULL,
  para_papel      papel_usuario NOT NULL,
  tipo            text          NOT NULL CHECK (tipo IN ('avanco', 'devolucao')),
  motivo          text,
  pendencias      text[],
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- Index para busca por processo (usado na timeline)
CREATE INDEX idx_tramitacao_processo ON tramitacao_historico(processo_id, created_at DESC);

-- Index para busca por setor (usado no painel "processos neste setor")
CREATE INDEX idx_tramitacao_para_papel ON tramitacao_historico(organizacao_id, para_papel);

ALTER TABLE tramitacao_historico ENABLE ROW LEVEL SECURITY;

-- Usuarios da org podem ler o historico dos processos da sua org
CREATE POLICY "tramitacao_select" ON tramitacao_historico
  FOR SELECT USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Apenas o sistema (service role) insere — via Server Action
CREATE POLICY "tramitacao_insert" ON tramitacao_historico
  FOR INSERT WITH CHECK (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
