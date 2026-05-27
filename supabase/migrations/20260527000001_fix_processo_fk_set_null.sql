-- Corrige FK de processo_id em tabelas com campo nullable:
-- acoes_ia, notificacoes e avisos_compra_conjunta nao tinham ON DELETE,
-- causando violacao de constraint ao excluir processos com registros filhos.
-- ON DELETE SET NULL preserva o historico (log de IA, notificacoes, avisos)
-- zerando apenas a referencia ao processo excluido.

-- acoes_ia
ALTER TABLE acoes_ia
  DROP CONSTRAINT IF EXISTS acoes_ia_processo_id_fkey;

ALTER TABLE acoes_ia
  ADD CONSTRAINT acoes_ia_processo_id_fkey
  FOREIGN KEY (processo_id)
  REFERENCES processos_licitatorios(id)
  ON DELETE SET NULL;

-- notificacoes
ALTER TABLE notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_processo_id_fkey;

ALTER TABLE notificacoes
  ADD CONSTRAINT notificacoes_processo_id_fkey
  FOREIGN KEY (processo_id)
  REFERENCES processos_licitatorios(id)
  ON DELETE SET NULL;

-- avisos_compra_conjunta
ALTER TABLE avisos_compra_conjunta
  DROP CONSTRAINT IF EXISTS avisos_compra_conjunta_processo_id_fkey;

ALTER TABLE avisos_compra_conjunta
  ADD CONSTRAINT avisos_compra_conjunta_processo_id_fkey
  FOREIGN KEY (processo_id)
  REFERENCES processos_licitatorios(id)
  ON DELETE SET NULL;
