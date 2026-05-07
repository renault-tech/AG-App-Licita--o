-- ============================================================
-- Tabela de publicacoes do processo licitatorio
-- Conforme Art. 54 da Lei 14.133/21: publicacao obrigatoria
-- no PNCP (Portal Nacional de Contratacoes Publicas).
-- ============================================================

create table publicacoes (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  processo_id     uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id  uuid not null references organizacoes(id),
  publicado_por   uuid not null references usuarios(id),
  -- Canais de publicacao
  pncp_numero     text,          -- numero no Portal Nacional de Contratacoes Publicas
  pncp_url        text,          -- link direto no PNCP
  diario_oficial  text,          -- referencia no Diario Oficial (numero, pagina, data)
  portal_proprio  text,          -- URL no portal da prefeitura
  -- Datas
  data_publicacao date not null default current_date,
  data_abertura   date,          -- data prevista para abertura das propostas
  -- Status
  status          text not null default 'publicado'
                    check (status in ('publicado', 'suspenso', 'cancelado', 'encerrado')),
  observacoes     text
);

create unique index idx_publicacoes_processo on publicacoes(processo_id);
create index idx_publicacoes_org on publicacoes(organizacao_id, status);

create trigger trg_publicacoes_updated_at
  before update on publicacoes
  for each row execute function set_updated_at();

alter table publicacoes enable row level security;

create policy "publicacoes da organizacao" on publicacoes
  for all using (organizacao_id = get_organizacao_id());
