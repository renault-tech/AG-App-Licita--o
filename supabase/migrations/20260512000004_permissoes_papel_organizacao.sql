-- ============================================================
-- Permissoes configuráveis por papel e etapa do processo
-- Permite que admins adaptem o fluxo da plataforma a realidade
-- de cada organizacao (municipio, estado, uniao)
-- Conforme principio da segregacao de funcoes da Lei 14.133/21
-- ============================================================

CREATE TABLE permissoes_papel_organizacao (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  papel          text        NOT NULL CHECK (papel IN (
    'requisitante', 'setor_licitacao', 'procurador',
    'autoridade_competente', 'admin_organizacao', 'admin_plataforma'
  )),
  tab_slug       text        NOT NULL CHECK (tab_slug IN (
    'dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital',
    'revisao', 'parecer', 'autorizacao', 'publicacao'
  )),
  pode_ver       boolean     NOT NULL DEFAULT false,
  pode_editar    boolean     NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE(organizacao_id, papel, tab_slug)
);

CREATE INDEX idx_permissoes_org_papel ON permissoes_papel_organizacao(organizacao_id, papel);

ALTER TABLE permissoes_papel_organizacao ENABLE ROW LEVEL SECURITY;

-- Qualquer usuario autenticado da org pode ler as permissoes
-- (necessario para o runtime verificar acesso sem service role)
CREATE POLICY "permissoes_org_select" ON permissoes_papel_organizacao
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

-- Somente admins da propria org podem inserir
CREATE POLICY "permissoes_org_insert" ON permissoes_papel_organizacao
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT papel FROM usuarios WHERE id = auth.uid()) IN ('admin_organizacao', 'admin_plataforma')
  );

-- Somente admins da propria org podem atualizar
CREATE POLICY "permissoes_org_update" ON permissoes_papel_organizacao
  FOR UPDATE USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT papel FROM usuarios WHERE id = auth.uid()) IN ('admin_organizacao', 'admin_plataforma')
  );

-- Somente admins da propria org podem deletar (restaurar padrao)
CREATE POLICY "permissoes_org_delete" ON permissoes_papel_organizacao
  FOR DELETE USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT papel FROM usuarios WHERE id = auth.uid()) IN ('admin_organizacao', 'admin_plataforma')
  );

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_permissoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER permissoes_papel_updated_at
  BEFORE UPDATE ON permissoes_papel_organizacao
  FOR EACH ROW EXECUTE FUNCTION update_permissoes_updated_at();