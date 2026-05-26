-- ============================================================
-- LicitaIA - Otimizações de Performance
-- Índices críticos, ajustes RLS e manutenção automática
-- ============================================================

-- ============================================================
-- 1. ÍNDICE EM usuarios(organizacao_id)
-- Crítico: toda chamada RLS executa get_organizacao_id() que
-- faz SELECT nesta tabela. Sem índice = seq scan por requisição.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacao
  ON usuarios(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_organizacao_papel
  ON usuarios(organizacao_id, papel);

-- ============================================================
-- 2. ÍNDICES EM TABELAS DE DOCUMENTOS (FK processo_id e organizacao_id)
-- Todas as páginas de processo fazem lookup por processo_id.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_dfd_processo
  ON dfd(processo_id);

CREATE INDEX IF NOT EXISTS idx_dfd_organizacao
  ON dfd(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_processo
  ON cotacoes(processo_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_organizacao
  ON cotacoes(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedores_cotacao
  ON cotacoes_fornecedores(cotacao_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_itens_cotacao
  ON cotacoes_itens(cotacao_id);

CREATE INDEX IF NOT EXISTS idx_etp_processo
  ON etp(processo_id);

CREATE INDEX IF NOT EXISTS idx_etp_organizacao
  ON etp(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_tr_processo
  ON termo_referencia(processo_id);

CREATE INDEX IF NOT EXISTS idx_tr_organizacao
  ON termo_referencia(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_mapa_riscos_processo
  ON mapa_riscos(processo_id);

CREATE INDEX IF NOT EXISTS idx_mapa_riscos_organizacao
  ON mapa_riscos(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_edital_processo
  ON edital(processo_id);

CREATE INDEX IF NOT EXISTS idx_edital_organizacao
  ON edital(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_pareceres_processo
  ON pareceres(processo_id);

CREATE INDEX IF NOT EXISTS idx_pareceres_organizacao
  ON pareceres(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_pareceres_procurador
  ON pareceres(procurador_id)
  WHERE procurador_id IS NOT NULL;

-- ============================================================
-- 3. ÍNDICES EM ASSINATURAS E VERSÕES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assinaturas_documento
  ON assinaturas(documento_id);

CREATE INDEX IF NOT EXISTS idx_assinaturas_organizacao
  ON assinaturas(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_versoes_organizacao
  ON versoes_documento(organizacao_id);

-- ============================================================
-- 4. ÍNDICES EM SECRETARIAS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_secretarias_organizacao
  ON secretarias(organizacao_id);

-- ============================================================
-- 5. ÍNDICES COMPOSTOS PARA PADRÕES DE DASHBOARD
-- Consultas mais frequentes do dashboard principal.
-- ============================================================

-- Dashboard: lista de processos por org + status
CREATE INDEX IF NOT EXISTS idx_processos_org_status
  ON processos_licitatorios(organizacao_id, status);

-- Dashboard procuradoria: pareceres pendentes por org
CREATE INDEX IF NOT EXISTS idx_pareceres_pendentes
  ON pareceres(organizacao_id, status)
  WHERE status = 'pendente';

-- Notificações não lidas (badge e lista)
CREATE INDEX IF NOT EXISTS idx_notificacoes_nao_lidas
  ON notificacoes(usuario_id, created_at DESC)
  WHERE lida = false;

-- ============================================================
-- 6. ÍNDICES PARA RELATÓRIOS DE IA E CRÉDITOS
-- Queries de consumo, histórico e relatórios financeiros.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_acoes_ia_org_data
  ON acoes_ia(organizacao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_data
  ON transacoes_credito(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transacoes_org_data
  ON transacoes_credito(organizacao_id, created_at DESC);

-- ============================================================
-- 7. TRIGGER updated_at FALTANTE EM creditos_usuario
-- A tabela tem a coluna mas nenhum trigger a atualizava.
-- ============================================================
CREATE TRIGGER trg_creditos_updated_at
  BEFORE UPDATE ON creditos_usuario
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. LIMPEZA AUTOMÁTICA DE rate_limit_janelas
-- Remove entradas com mais de 2 janelas de tempo para evitar
-- crescimento indefinido da tabela.
-- ============================================================
CREATE OR REPLACE FUNCTION limpar_rate_limit_expiradas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_janelas
  WHERE janela_inicio < now() - interval '2 hours';
END;
$$;

-- Cron via pg_cron (se disponível no projeto Supabase)
-- Descomente após confirmar que pg_cron está ativo:
-- SELECT cron.schedule('limpar-rate-limit', '*/30 * * * *', 'SELECT limpar_rate_limit_expiradas()');


-- ============================================================
-- 10. ÍNDICE GIN EM edital.conteudo (JSONB)
-- O edital tem conteúdo jsonb com seções variáveis por modalidade.
-- GIN permite busca eficiente por chave/valor dentro do documento.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_edital_conteudo_gin
  ON edital USING GIN (conteudo);

-- ============================================================
-- 11. ÍNDICE GIN EM mapa_riscos.riscos (JSONB)
-- A matriz de riscos é consultada e filtrada por nível/categoria.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mapa_riscos_gin
  ON mapa_riscos USING GIN (riscos);

-- ============================================================
-- 12. CONSTRAINT ÚNICA EM rate_limit_janelas.chave
-- Evita duplicatas e garante upsert atômico seguro.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_rate_limit_janelas_chave'
      AND conrelid = 'rate_limit_janelas'::regclass
  ) THEN
    ALTER TABLE rate_limit_janelas ADD CONSTRAINT uq_rate_limit_janelas_chave UNIQUE (chave);
  END IF;
END$$;

-- Remove o índice não-único anterior (substituído pela constraint)
DROP INDEX IF EXISTS idx_rate_limit_janelas_chave;

-- Recria composto para consultas por janela de tempo (monitoring)
CREATE INDEX IF NOT EXISTS idx_rate_limit_janelas_tempo
  ON rate_limit_janelas(janela_inicio DESC);
