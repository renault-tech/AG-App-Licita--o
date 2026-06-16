-- ============================================================
-- LicitaIA - Modulo de Cotacao de Precos PNCP
-- Conforme Lei 14.133/2021, Art. 23, incisos I, II e III
-- ------------------------------------------------------------
-- Sistema unico de pesquisa de precos da plataforma:
--   - Cotacao independente (sem processo) ou vinculada a processo
--   - Fontes: Compras Governamentais, Preco Publico (PNCP), Preco Web
--   - Mediana como teto legal (inciso I); atualizacao por indice (inciso II)
--   - Layout espelhado de layout_pesquisa_precos_pncp.json
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS (criados de forma idempotente)
-- ------------------------------------------------------------
do $$ begin
  create type tipo_fonte_preco as enum (
    'compras_governamentais',
    'preco_publico',
    'preco_web',
    'pesquisa_direta'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type indice_atualizacao as enum ('ipca', 'igpm', 'inpc');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_catalogo_item as enum ('material', 'servico');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_item_cotacao as enum ('ok', 'pendente_insuficiente');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- COTACOES: torna independente e adiciona metadados do relatorio
-- ------------------------------------------------------------
alter table cotacoes
  alter column processo_id drop not null;

alter table cotacoes
  add column if not exists titulo               text,
  add column if not exists indice_atualizacao   indice_atualizacao not null default 'ipca',
  add column if not exists codigo_validacao      text,
  add column if not exists ip_geracao            text,
  add column if not exists gerado_em             timestamptz,
  add column if not exists valor_total_geral     numeric(15,2);

-- ------------------------------------------------------------
-- COTACOES_ITENS: estrutura por item conforme layout de referencia
-- ------------------------------------------------------------
alter table cotacoes_itens
  add column if not exists numero               integer,
  add column if not exists titulo               text,
  add column if not exists codigo_catalogo      text,
  add column if not exists tipo_catalogo        tipo_catalogo_item,
  add column if not exists precos_utilizados    integer not null default 0,
  add column if not exists propostas_encontradas integer not null default 0,
  add column if not exists preco_estimado       numeric(15,4),
  add column if not exists percentual           numeric(7,4),
  add column if not exists preco_est_calculado  numeric(15,4),
  add column if not exists total                numeric(15,2),
  add column if not exists mediana_precos       numeric(15,4),
  add column if not exists media_precos         numeric(15,4),
  add column if not exists status_item          status_item_cotacao not null default 'pendente_insuficiente';

-- ------------------------------------------------------------
-- COTACOES_ITENS_FONTES: agrupa registros por tipo de fonte
-- (um item pode combinar mais de uma fonte, cada uma com seu valor unitario)
-- ------------------------------------------------------------
create table if not exists cotacoes_itens_fontes (
  id             uuid primary key default uuid_generate_v4(),
  cotacao_item_id uuid not null references cotacoes_itens(id) on delete cascade,
  tipo_fonte     tipo_fonte_preco not null,
  valor_unitario numeric(15,4),
  ordem          integer not null default 0
);

-- ------------------------------------------------------------
-- COTACOES_FONTES_REGISTROS: cada preco individual recuperado
-- Campos PNCP/governamentais e campos de fonte web coexistem;
-- apenas os pertinentes a cada tipo de fonte sao preenchidos.
-- ------------------------------------------------------------
create table if not exists cotacoes_fontes_registros (
  id                   uuid primary key default uuid_generate_v4(),
  fonte_id             uuid not null references cotacoes_itens_fontes(id) on delete cascade,
  indice               integer not null,
  -- Campos para fontes PNCP (Compras Governamentais / Preco Publico)
  orgao_cnpj           text,
  orgao_nome           text,
  unidade_codigo       text,
  unidade_nome         text,
  identificacao        text,
  data_licitacao       date,
  valor_original       numeric(15,4),
  valor_atualizado     numeric(15,4),
  -- Campos para fonte Web (inciso III): URL e data/hora de acesso obrigatorios
  fonte_nome           text,
  url                  text,
  descricao_produto    text,
  data_hora_acesso     timestamptz,
  -- Rastreabilidade e controle de outlier
  origem_id            text,                       -- idCompra/idItemCompra da API de origem
  preco                numeric(15,4),              -- valor da fonte web (espelha valor_original)
  is_outlier           boolean not null default false,
  excluido             boolean not null default false,
  justificativa_exclusao text
);

create index if not exists idx_cot_itens_fontes_item on cotacoes_itens_fontes(cotacao_item_id);
create index if not exists idx_cot_fontes_registros_fonte on cotacoes_fontes_registros(fonte_id);

-- ------------------------------------------------------------
-- FONTES_WEB_CONFIAVEIS: lista configuravel por organizacao (inciso III)
-- ------------------------------------------------------------
create table if not exists fontes_web_confiaveis (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  nome           text not null,
  dominio        text not null,
  ativo          boolean not null default true
);

create index if not exists idx_fontes_web_org on fontes_web_confiaveis(organizacao_id);

-- ------------------------------------------------------------
-- RLS: usuario so enxerga registros da sua organizacao
-- ------------------------------------------------------------
alter table cotacoes_itens_fontes    enable row level security;
alter table cotacoes_fontes_registros enable row level security;
alter table fontes_web_confiaveis    enable row level security;

create policy "fontes via item da cotacao"
  on cotacoes_itens_fontes for all
  using (exists (
    select 1 from cotacoes_itens ci
    join cotacoes c on c.id = ci.cotacao_id
    where ci.id = cotacao_item_id and c.organizacao_id = get_organizacao_id()
  ));

create policy "registros via fonte da cotacao"
  on cotacoes_fontes_registros for all
  using (exists (
    select 1 from cotacoes_itens_fontes f
    join cotacoes_itens ci on ci.id = f.cotacao_item_id
    join cotacoes c on c.id = ci.cotacao_id
    where f.id = fonte_id and c.organizacao_id = get_organizacao_id()
  ));

create policy "fontes web da organizacao"
  on fontes_web_confiaveis for all
  using (organizacao_id = get_organizacao_id());
