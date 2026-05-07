-- ============================================================
-- Tabela de autorizacoes da autoridade competente
-- Conforme Art. 72 da Lei 14.133/21: a autoridade competente
-- autoriza o processo apos o parecer juridico favoravel.
-- ============================================================

create table autorizacoes (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  processo_id    uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id),
  autorizado_por uuid references usuarios(id),
  status         text not null default 'pendente'
                   check (status in ('pendente', 'autorizado', 'devolvido')),
  observacao     text,
  -- timestamp do ato de autorizacao
  autorizado_em  timestamptz
);

create unique index idx_autorizacoes_processo on autorizacoes(processo_id);
create index idx_autorizacoes_org on autorizacoes(organizacao_id, status);

create trigger trg_autorizacoes_updated_at
  before update on autorizacoes
  for each row execute function set_updated_at();

alter table autorizacoes enable row level security;

create policy "autorizacoes da organizacao" on autorizacoes
  for all using (organizacao_id = get_organizacao_id());
