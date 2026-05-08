-- ============================================================
-- LicitaIA - DFD com Adesão Compartilhada
-- Reestrutura tabela dfd e adiciona fluxo de participação
-- entre secretarias (compras compartilhadas, Arts. 82-90 da
-- Lei 14.133/21 e Decreto 11.462/2023)
-- ============================================================

-- ============================================================
-- 1. SECRETARIAS: adicionar contato e secretario
-- ============================================================

alter table secretarias
  add column if not exists email     text,
  add column if not exists telefone  text,
  add column if not exists secretario_nome text;

-- ============================================================
-- 2. ENUMS novos
-- ============================================================

create type tipo_dfd as enum (
  'individual',
  'compartilhado'
);

create type status_adesao_dfd as enum (
  'rascunho',
  'aguardando_adesao',
  'prazo_encerrado',
  'consolidado'
);

create type status_participacao_dfd as enum (
  'pendente',
  'aderida',
  'recusada'
);

create type tipo_participacao_dfd as enum (
  'iniciadora',
  'participante'
);

-- ============================================================
-- 3. REESTRUTURAR TABELA DFD
-- Remove colunas do modelo antigo, adiciona modelo real
-- ============================================================

-- Remove colunas do modelo antigo que nao existem no modelo real
alter table dfd
  drop column if exists responsavel_elaboracao,
  drop column if exists descricao_necessidade,
  drop column if exists prazo_contratacao,
  drop column if exists observacoes;

-- Adiciona colunas do modelo real
alter table dfd
  add column if not exists objeto                   text not null default '',
  add column if not exists justificativa_necessidade text,
  add column if not exists tipo                     tipo_dfd not null default 'individual',
  add column if not exists status_adesao            status_adesao_dfd not null default 'rascunho',
  add column if not exists prazo_adesao             timestamptz,
  add column if not exists consolidado_em           timestamptz,

  -- Referencia a secretaria que originou o DFD
  add column if not exists secretaria_id            uuid references secretarias(id),

  -- Snapshot dos dados da secretaria no momento da criacao (imutabilidade documental)
  add column if not exists secretaria_nome          text not null default '',
  add column if not exists secretaria_email         text,
  add column if not exists secretaria_telefone      text,
  add column if not exists secretario_responsavel   text,

  -- Responsavel pela elaboracao = usuario logado (snapshot do nome)
  add column if not exists responsavel_elaboracao   text not null default '',

  -- Dados da secretaria iniciadora
  add column if not exists fiscal_contrato          text,
  add column if not exists dotacao_orcamentaria     text;

-- Remove o default temporario apos adicionar (nao precisamos de default permanente)
alter table dfd alter column objeto drop default;
alter table dfd alter column secretaria_nome drop default;
alter table dfd alter column responsavel_elaboracao drop default;

-- ============================================================
-- 4. DFD_ITENS: itens do Anexo Unico (definidos pela secretaria iniciadora)
-- ============================================================

create table dfd_itens (
  id              uuid primary key default uuid_generate_v4(),
  dfd_id          uuid not null references dfd(id) on delete cascade,
  numero_item     smallint not null,
  especificacao   text not null,
  unidade_medida  text not null default 'un',
  observacoes     text,
  created_at      timestamptz not null default now(),

  unique (dfd_id, numero_item)
);

create index idx_dfd_itens_dfd on dfd_itens(dfd_id);

-- ============================================================
-- 5. DFD_PARTICIPACOES: cada secretaria participante (inclusive iniciadora)
-- ============================================================

create table dfd_participacoes (
  id                    uuid primary key default uuid_generate_v4(),
  dfd_id                uuid not null references dfd(id) on delete cascade,
  secretaria_id         uuid not null references secretarias(id),
  tipo                  tipo_participacao_dfd not null default 'participante',
  status                status_participacao_dfd not null default 'pendente',

  -- Dados proprios da secretaria participante
  fiscal_contrato       text,
  dotacao_orcamentaria  text,

  -- Snapshot da secretaria no momento do envio
  secretaria_nome       text not null default '',
  secretaria_email      text,
  secretaria_telefone   text,
  secretario_responsavel text,

  -- Controle de fluxo
  enviado_em            timestamptz,
  prazo_resposta        timestamptz,
  respondido_em         timestamptz,
  respondido_por        uuid references usuarios(id),

  created_at            timestamptz not null default now(),

  unique (dfd_id, secretaria_id)
);

create index idx_participacoes_dfd    on dfd_participacoes(dfd_id);
create index idx_participacoes_sec    on dfd_participacoes(secretaria_id);
create index idx_participacoes_status on dfd_participacoes(status);

-- ============================================================
-- 6. DFD_PARTICIPACOES_ITENS: quantidade por secretaria por item
-- ============================================================

create table dfd_participacoes_itens (
  id              uuid primary key default uuid_generate_v4(),
  participacao_id uuid not null references dfd_participacoes(id) on delete cascade,
  dfd_item_id     uuid not null references dfd_itens(id) on delete cascade,
  quantidade      numeric(15,4) not null default 0,
  observacoes     text,

  unique (participacao_id, dfd_item_id)
);

create index idx_part_itens_participacao on dfd_participacoes_itens(participacao_id);
create index idx_part_itens_item         on dfd_participacoes_itens(dfd_item_id);

-- ============================================================
-- 7. RLS nas novas tabelas
-- ============================================================

alter table dfd_itens             enable row level security;
alter table dfd_participacoes     enable row level security;
alter table dfd_participacoes_itens enable row level security;

-- dfd_itens: usuarios da mesma organizacao enxergam
create policy "dfd_itens_org" on dfd_itens
  for all using (
    exists (
      select 1 from dfd d
      join processos_licitatorios p on p.id = d.processo_id
      join usuarios u on u.organizacao_id = p.organizacao_id
      where d.id = dfd_itens.dfd_id
        and u.id = auth.uid()
    )
  );

-- dfd_participacoes: a secretaria convidada ve seu proprio registro;
-- a organizacao iniciadora ve todos
create policy "dfd_participacoes_acesso" on dfd_participacoes
  for all using (
    -- secretaria participante ve seu proprio registro
    secretaria_id in (
      select s.id from secretarias s
      join usuarios u on u.organizacao_id = s.organizacao_id
      where u.id = auth.uid()
    )
    or
    -- qualquer usuario da organizacao dona do dfd ve todos
    exists (
      select 1 from dfd d
      join processos_licitatorios p on p.id = d.processo_id
      join usuarios u on u.organizacao_id = p.organizacao_id
      where d.id = dfd_participacoes.dfd_id
        and u.id = auth.uid()
    )
  );

-- dfd_participacoes_itens: herda acesso via participacao
create policy "dfd_part_itens_acesso" on dfd_participacoes_itens
  for all using (
    exists (
      select 1 from dfd_participacoes dp
      join dfd d on d.id = dp.dfd_id
      join processos_licitatorios p on p.id = d.processo_id
      join usuarios u on u.organizacao_id = p.organizacao_id
      where dp.id = dfd_participacoes_itens.participacao_id
        and u.id = auth.uid()
    )
  );

-- ============================================================
-- 8. NOTIFICACOES: garantir campo payload jsonb se nao existir
-- ============================================================

alter table notificacoes
  add column if not exists payload jsonb;