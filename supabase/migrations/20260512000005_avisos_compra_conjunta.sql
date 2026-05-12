-- supabase/migrations/20260512000005_avisos_compra_conjunta.sql
-- Módulo Aviso de Compra Conjunta (pré-processo)
-- Permite que secretarias comuniquem intenção de licitar e recebam adesões
-- antes da abertura do processo licitatório formal.

-- ============================================================
-- 1. TABELA PRINCIPAL: avisos_compra_conjunta
-- ============================================================

create table avisos_compra_conjunta (
  id                    uuid primary key default uuid_generate_v4(),
  organizacao_id        uuid not null references organizacoes(id) on delete cascade,
  secretaria_origem_id  uuid not null references secretarias(id),
  criado_por            uuid not null references usuarios(id),
  modalidade            text not null,
  categoria_objeto      text not null,
  prazo_adesao          timestamptz not null,
  status                text not null default 'aberto'
                          check (status in ('aberto', 'encerrado', 'processo_iniciado')),
  processo_id           uuid references processos_licitatorios(id),
  created_at            timestamptz not null default now()
);

create index idx_avisos_org      on avisos_compra_conjunta(organizacao_id);
create index idx_avisos_origem   on avisos_compra_conjunta(secretaria_origem_id);
create index idx_avisos_status   on avisos_compra_conjunta(status);

-- ============================================================
-- 2. ITENS DA SECRETARIA DE ORIGEM
-- ============================================================

create table avisos_itens (
  id               uuid primary key default uuid_generate_v4(),
  aviso_id         uuid not null references avisos_compra_conjunta(id) on delete cascade,
  descricao        text not null,
  unidade          text not null default 'unidade',
  quantidade_origem integer not null check (quantidade_origem > 0),
  categoria_objeto text not null,
  created_at       timestamptz not null default now()
);

create index idx_avisos_itens_aviso on avisos_itens(aviso_id);

-- ============================================================
-- 3. SECRETARIAS DESTINATÁRIAS
-- ============================================================

create table avisos_destinatarias (
  id              uuid primary key default uuid_generate_v4(),
  aviso_id        uuid not null references avisos_compra_conjunta(id) on delete cascade,
  secretaria_id   uuid not null references secretarias(id),
  status          text not null default 'pendente'
                    check (status in ('pendente', 'aderiu', 'recusou')),
  respondido_em   timestamptz,
  created_at      timestamptz not null default now(),

  unique (aviso_id, secretaria_id)
);

create index idx_avisos_dest_aviso on avisos_destinatarias(aviso_id);
create index idx_avisos_dest_sec   on avisos_destinatarias(secretaria_id);

-- ============================================================
-- 4. ADESÕES (resposta de cada secretaria)
-- ============================================================

create table avisos_adesoes (
  id                   uuid primary key default uuid_generate_v4(),
  aviso_id             uuid not null references avisos_compra_conjunta(id) on delete cascade,
  secretaria_id        uuid not null references secretarias(id),
  fiscal_nome          text not null,
  dotacao_orcamentaria text not null,
  created_at           timestamptz not null default now(),

  unique (aviso_id, secretaria_id)
);

create index idx_adesoes_aviso on avisos_adesoes(aviso_id);
create index idx_adesoes_sec   on avisos_adesoes(secretaria_id);

-- ============================================================
-- 5. ITENS DE CADA ADESÃO
-- ============================================================

create table avisos_adesoes_itens (
  id             uuid primary key default uuid_generate_v4(),
  adesao_id      uuid not null references avisos_adesoes(id) on delete cascade,
  aviso_item_id  uuid references avisos_itens(id) on delete set null,
  descricao      text not null,
  unidade        text not null default 'unidade',
  quantidade     integer not null check (quantidade > 0),
  categoria_objeto text not null,
  created_at     timestamptz not null default now()
);

create index idx_adesoes_itens_adesao on avisos_adesoes_itens(adesao_id);

-- ============================================================
-- 6. RLS
-- ============================================================

alter table avisos_compra_conjunta  enable row level security;
alter table avisos_itens            enable row level security;
alter table avisos_destinatarias    enable row level security;
alter table avisos_adesoes          enable row level security;
alter table avisos_adesoes_itens    enable row level security;

-- avisos_compra_conjunta: usuários da mesma organização
create policy "avisos_org" on avisos_compra_conjunta
  for all using (
    organizacao_id in (
      select organizacao_id from usuarios where id = auth.uid()
    )
  );

-- avisos_itens: via aviso da mesma org
create policy "avisos_itens_org" on avisos_itens
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_destinatarias: mesma org
create policy "avisos_dest_org" on avisos_destinatarias
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_adesoes: mesma org
create policy "avisos_adesoes_org" on avisos_adesoes
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_adesoes_itens: via adesão da mesma org
create policy "avisos_adesoes_itens_org" on avisos_adesoes_itens
  for all using (
    adesao_id in (
      select ad.id from avisos_adesoes ad
      join avisos_compra_conjunta a on a.id = ad.aviso_id
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );
