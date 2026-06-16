-- ============================================================
-- Cotacao: numero de cotacoes configuravel + marcacao de uso
-- Modelo Banco de Precos: usa N cotacoes (padrao 3), exibe "N/encontradas"
-- ============================================================

alter table cotacoes
  add column if not exists quantidade_cotacoes integer not null default 3;

-- Marca quais registros entraram no calculo (as N mais recentes nao-outlier).
-- false = encontrada mas nao utilizada (aparece apenas ao expandir).
alter table cotacoes_fontes_registros
  add column if not exists utilizado boolean not null default true;
