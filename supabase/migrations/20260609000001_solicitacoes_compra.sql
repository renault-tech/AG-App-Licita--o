-- ============================================================
-- LicitaIA - Solicitacoes de Compra
-- DFD autonomo criado por secretarias antes de um processo
-- existir, alimentando o fluxo licitatorio via setor de compras
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

create type status_solicitacao_compra as enum (
  'rascunho',
  'enviada',
  'em_analise',
  'aprovada',
  'recusada',
  'convertida'
);

create type prioridade_solicitacao as enum (
  'baixa',
  'media',
  'alta',
  'urgente'
);

-- ============================================================
-- 2. SOLICITACOES_COMPRA
-- ============================================================

create table solicitacoes_compra (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  organizacao_id       uuid not null references organizacoes(id) on delete cascade,
  secretaria_id        uuid references secretarias(id) on delete set null,
  usuario_id           uuid not null references usuarios(id) on delete cascade,

  status               status_solicitacao_compra not null default 'rascunho',
  prioridade           prioridade_solicitacao not null default 'media',

  objeto               text not null,
  justificativa        text,
  data_necessidade     date,

  motivo_recusa        text,
  recusado_por         uuid references usuarios(id),
  recusado_em          timestamptz,

  -- Preenchido ao converter em processo licitatorio
  processo_id          uuid references processos_licitatorios(id) on delete set null,
  convertido_por       uuid references usuarios(id),
  convertido_em        timestamptz
);

create index idx_solicitacoes_org    on solicitacoes_compra(organizacao_id);
create index idx_solicitacoes_status on solicitacoes_compra(status);
create index idx_solicitacoes_user   on solicitacoes_compra(usuario_id);
create index idx_solicitacoes_sec    on solicitacoes_compra(secretaria_id);

create trigger trg_solicitacoes_updated_at
  before update on solicitacoes_compra
  for each row execute function set_updated_at();

-- ============================================================
-- 3. SOLICITACOES_ITENS
-- Itens com codigo CATMAT/CATSER para uniformizacao da demanda
-- ============================================================

create table solicitacoes_itens (
  id                           uuid primary key default uuid_generate_v4(),
  created_at                   timestamptz not null default now(),

  solicitacao_id               uuid not null references solicitacoes_compra(id) on delete cascade,
  numero_item                  smallint not null,

  catmat_codigo                varchar(10),
  catmat_pdm_codigo            varchar(10),
  catmat_descricao             text,
  catmat_unidade               varchar(20),

  especificacao_complementar   text,
  quantidade                   numeric(15,4) not null default 1,
  unidade_medida               varchar(20) not null default 'un',
  valor_estimado_unitario      numeric(15,2),

  unique (solicitacao_id, numero_item)
);

create index idx_sol_itens_solicitacao on solicitacoes_itens(solicitacao_id);

-- ============================================================
-- 4. RLS
-- ============================================================

alter table solicitacoes_compra enable row level security;
alter table solicitacoes_itens  enable row level security;

-- Requisitante ve as proprias; gestao ve todas da org
create policy "sol_compra_select" on solicitacoes_compra
  for select using (
    usuario_id = auth.uid()
    or (
      organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
      and (select papel from usuarios where id = auth.uid()) in (
        'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma'
      )
    )
  );

create policy "sol_compra_insert" on solicitacoes_compra
  for insert with check (
    usuario_id = auth.uid()
    and organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

create policy "sol_compra_update" on solicitacoes_compra
  for update using (
    -- autor edita rascunho proprio
    (usuario_id = auth.uid() and status = 'rascunho')
    or
    -- gestao atualiza status
    (
      organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
      and (select papel from usuarios where id = auth.uid()) in (
        'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma'
      )
    )
  );

create policy "sol_compra_delete" on solicitacoes_compra
  for delete using (
    usuario_id = auth.uid() and status = 'rascunho'
  );

-- Itens herdam acesso da solicitacao pai
create policy "sol_itens_select" on solicitacoes_itens
  for select using (
    exists (
      select 1 from solicitacoes_compra s
      where s.id = solicitacoes_itens.solicitacao_id
        and (
          s.usuario_id = auth.uid()
          or (
            s.organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
            and (select papel from usuarios where id = auth.uid()) in (
              'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma'
            )
          )
        )
    )
  );

create policy "sol_itens_insert" on solicitacoes_itens
  for insert with check (
    exists (
      select 1 from solicitacoes_compra s
      where s.id = solicitacoes_itens.solicitacao_id
        and s.usuario_id = auth.uid()
        and s.status in ('rascunho', 'enviada')
    )
  );

create policy "sol_itens_update" on solicitacoes_itens
  for update using (
    exists (
      select 1 from solicitacoes_compra s
      where s.id = solicitacoes_itens.solicitacao_id
        and s.usuario_id = auth.uid()
        and s.status = 'rascunho'
    )
  );

create policy "sol_itens_delete" on solicitacoes_itens
  for delete using (
    exists (
      select 1 from solicitacoes_compra s
      where s.id = solicitacoes_itens.solicitacao_id
        and s.usuario_id = auth.uid()
        and s.status = 'rascunho'
    )
  );
