-- supabase/migrations/20260518000001_add_roles_novos.sql
-- ============================================================
-- Expansao do enum papel_usuario
-- Adiciona setor_compras e publicacao
-- Renomeia autoridade_competente para gestor_publico
-- Conforme spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

-- Adiciona novos valores ao enum (nao destrói dados existentes)
ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'setor_compras';
ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'publicacao';

-- Renomeia autoridade_competente para gestor_publico
-- Atualiza o enum primeiro
ALTER TYPE papel_usuario RENAME VALUE 'autoridade_competente' TO 'gestor_publico';

-- Atualiza registros existentes na tabela usuarios
-- (o ALTER TYPE RENAME VALUE ja cuida do enum, mas se houver
--  colunas text com o valor antigo, atualizar aqui)
UPDATE usuarios
  SET papel = 'gestor_publico'
  WHERE papel::text = 'autoridade_competente';

-- Atualiza a constraint CHECK em permissoes_papel_organizacao
ALTER TABLE permissoes_papel_organizacao
  DROP CONSTRAINT IF EXISTS permissoes_papel_organizacao_papel_check;

ALTER TABLE permissoes_papel_organizacao
  ADD CONSTRAINT permissoes_papel_organizacao_papel_check
  CHECK (papel IN (
    'requisitante',
    'setor_compras',
    'setor_licitacao',
    'procurador',
    'gestor_publico',
    'admin_organizacao',
    'admin_plataforma',
    'publicacao'
  ));
