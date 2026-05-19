-- supabase/migrations/20260518000008_cotacao_pendente.sql
-- ============================================================
-- Adiciona flag de cotacao pendente ao processo
-- Cotacao nao bloqueante: sinalizada com aviso amarelo no wizard
-- ============================================================

ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS cotacao_pendente boolean NOT NULL DEFAULT false;
