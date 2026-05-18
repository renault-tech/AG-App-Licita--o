-- supabase/migrations/20260518000004_fase_atual_processo.sql
-- ============================================================
-- Adiciona coluna fase_atual ao processo licitatorio
-- Representa qual papel (setor) esta com o processo no momento
-- ============================================================

ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS fase_atual papel_usuario DEFAULT 'requisitante';

-- Preenche fase_atual nos processos existentes baseado em etapa_atual
UPDATE processos_licitatorios SET fase_atual = CASE
  WHEN etapa_atual <= 1 THEN 'requisitante'::papel_usuario
  WHEN etapa_atual = 2  THEN 'setor_compras'::papel_usuario
  WHEN etapa_atual = 3  THEN 'setor_licitacao'::papel_usuario
  WHEN etapa_atual = 4  THEN 'procurador'::papel_usuario
  WHEN etapa_atual = 5  THEN 'gestor_publico'::papel_usuario
  WHEN etapa_atual >= 6 THEN 'publicacao'::papel_usuario
  ELSE 'requisitante'::papel_usuario
END;

CREATE INDEX IF NOT EXISTS idx_processos_fase_atual
  ON processos_licitatorios(organizacao_id, fase_atual);
