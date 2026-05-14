-- ============================================================
-- LicitaIA - Módulo 9: Declaração e Ofício + Ajustes de Pagamento
-- Declaração do Setor Requisitante e Ofício de Abertura
-- Adiciona colunas de idempotência em transacoes_credito
-- ============================================================

-- ============================================================
-- DECLARACAO DO SETOR REQUISITANTE (Módulo 9 - Lei 14.133/21)
-- Formaliza a necessidade da contratação pelo setor requisitante
-- ============================================================

create table declaracoes_setor (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  processo_id       uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id    uuid not null references organizacoes(id),
  objeto            text not null default '',
  justificativa     text not null default '',
  declarante_nome   text not null default '',
  declarante_cargo  text not null default '',
  declarante_setor  text not null default '',
  local_data        text not null default '',
  status            status_documento not null default 'rascunho',
  gerado_por_ia     boolean not null default false,
  criado_por        uuid not null references usuarios(id),

  -- Uma declaração por processo
  unique (processo_id)
);

create trigger trg_declaracoes_updated_at
  before update on declaracoes_setor
  for each row execute function set_updated_at();

create index idx_declaracoes_processo on declaracoes_setor(processo_id);

-- ============================================================
-- OFICIO DE ABERTURA (Módulo 9 - Lei 14.133/21)
-- Comunica formalmente a abertura à Procuradoria (Art. 53)
-- ============================================================

create table oficios_abertura (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  processo_id         uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id      uuid not null references organizacoes(id),
  numero_oficio       text not null default '',
  destinatario_nome   text not null default '',
  destinatario_cargo  text not null default '',
  assunto             text not null default '',
  corpo               text not null default '',
  emitente_nome       text not null default '',
  emitente_cargo      text not null default '',
  local_data          text not null default '',
  status              status_documento not null default 'rascunho',
  gerado_por_ia       boolean not null default false,
  criado_por          uuid not null references usuarios(id),

  -- Um ofício por processo
  unique (processo_id)
);

create trigger trg_oficios_updated_at
  before update on oficios_abertura
  for each row execute function set_updated_at();

create index idx_oficios_processo on oficios_abertura(processo_id);

-- ============================================================
-- AJUSTE: transacoes_credito — adicionar colunas de pagamento
-- Necessário para idempotência dos webhooks Stripe/MercadoPago
-- ============================================================

alter table transacoes_credito
  add column if not exists referencia_externa text unique,
  add column if not exists provedor text check (provedor in ('stripe', 'mercadopago', 'manual', 'sistema'));

create index if not exists idx_transacoes_referencia on transacoes_credito(referencia_externa)
  where referencia_externa is not null;

-- ============================================================
-- AJUSTE: assinaturas — adicionar url_assinatura e referencia_externa
-- Necessário para adapters ZapSign e Gov.br
-- ============================================================

alter table assinaturas
  add column if not exists url_assinatura     text,
  add column if not exists referencia_externa text;

-- ============================================================
-- ROW LEVEL SECURITY — novas tabelas
-- ============================================================

alter table declaracoes_setor enable row level security;
alter table oficios_abertura   enable row level security;

create policy "declaracoes da organizacao"
  on declaracoes_setor for all
  using (organizacao_id = get_organizacao_id());

create policy "oficios da organizacao"
  on oficios_abertura for all
  using (organizacao_id = get_organizacao_id());
