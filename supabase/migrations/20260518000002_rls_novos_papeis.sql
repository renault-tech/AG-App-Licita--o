-- supabase/migrations/20260518000002_rls_novos_papeis.sql
-- ============================================================
-- Atualiza dados e policies que referenciavam autoridade_competente
-- como string literal (coluna text, nao enum).
--
-- Contexto:
--   - Migration 00001 renomeou o enum papel_usuario e recriou a
--     CHECK constraint em permissoes_papel_organizacao.
--   - Esta migration corrige dados existentes na coluna papel (text)
--     da tabela permissoes_papel_organizacao que ainda tenham o
--     valor antigo, e adiciona policies de acesso a autorizacoes
--     segmentadas pelo novo papel gestor_publico.
--
-- Conforme principio da segregacao de funcoes — Lei 14.133/21
-- ============================================================

-- ============================================================
-- 1. Migra dados na coluna text de permissoes_papel_organizacao
-- ============================================================
-- A coluna papel em permissoes_papel_organizacao e do tipo text.
-- O ALTER TYPE RENAME VALUE (migration 00001) nao atualiza linhas
-- existentes nessa coluna, portanto a atualizacao e feita aqui.

-- Verifica que a migration 00001 foi aplicada com sucesso antes de prosseguir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'permissoes_papel_organizacao'
    AND constraint_name = 'permissoes_papel_organizacao_papel_check'
    AND constraint_type = 'CHECK'
  ) THEN
    RAISE EXCEPTION 'Pre-requisito nao encontrado: constraint permissoes_papel_organizacao_papel_check ausente. Execute a migration 00001 antes desta.';
  END IF;
END $$;

UPDATE permissoes_papel_organizacao
  SET papel = 'gestor_publico'
  WHERE papel = 'autoridade_competente';

-- Extende permissoes_papel_organizacao para aceitar os novos papeis
-- setor_compras e publicacao (adicionados ao enum na migration 00001).
-- A CHECK constraint ja foi recriada pela 00001 incluindo esses valores;
-- nao e necessario recria-la novamente aqui.

-- ============================================================
-- 2. Policies de acesso a autorizacoes
-- ============================================================
-- A tabela autorizacoes (migration 20260507000001) ja possui a policy
-- generica "autorizacoes da organizacao" (FOR ALL) que autoriza
-- INSERT, UPDATE e SELECT para usuarios da organizacao.
-- Restricoes de papel (gestor_publico, admin) serao aplicadas no
-- nivel da aplicacao (Server Actions e middleware), nao em RLS.

-- ============================================================
-- 3. Migra dados na tabela procuradores (se existir coluna papel text)
-- ============================================================
-- Guardado para o caso de a tabela procuradores ter sido criada
-- com uma coluna papel do tipo text referenciando o nome antigo.
DO $$
BEGIN
  UPDATE procuradores
    SET papel = 'gestor_publico'
    WHERE papel = 'autoridade_competente';
EXCEPTION
  WHEN undefined_table  THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

-- ============================================================
-- 4. Verificacao final
-- ============================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM permissoes_papel_organizacao
    WHERE papel = 'autoridade_competente';

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'MIGRATION FAILED: % linhas em permissoes_papel_organizacao ainda usam autoridade_competente.',
      v_count;
  END IF;

  RAISE NOTICE
    'Migration 00002 concluida: dados migrados para gestor_publico, policies de autorizacoes criadas.';
END $$;
