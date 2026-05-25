-- canais de chat: processo-especifico, por setor ou geral da plataforma
create table canais_chat (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references organizacoes(id) on delete cascade,
  tipo            text not null check (tipo in ('processo', 'setor', 'plataforma')),
  referencia_id   uuid,
  nome            text not null,
  criado_em       timestamptz not null default now()
);

-- mensagens de qualquer canal
create table mensagens_chat (
  id              uuid primary key default gen_random_uuid(),
  canal_id        uuid not null references canais_chat(id) on delete cascade,
  autor_id        uuid not null references usuarios(id) on delete cascade,
  conteudo        text not null check (char_length(conteudo) between 1 and 4000),
  respondendo_a   uuid references mensagens_chat(id),
  editado_em      timestamptz,
  criado_em       timestamptz not null default now()
);

-- controle de ultima leitura por usuario por canal
create table leituras_chat (
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  canal_id        uuid not null references canais_chat(id) on delete cascade,
  ultima_leitura  timestamptz not null default now(),
  primary key (usuario_id, canal_id)
);

-- conversas com o assistente IA por processo
create table conversas_assistente (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references processos_licitatorios(id) on delete cascade,
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  historico       jsonb not null default '[]'::jsonb,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (processo_id, usuario_id)
);

-- indices para performance
create index on mensagens_chat(canal_id, criado_em desc);
create index on canais_chat(organizacao_id, tipo);
create index on conversas_assistente(processo_id, usuario_id);

-- habilitar realtime para mensagens
alter publication supabase_realtime add table mensagens_chat;

-- RLS
alter table canais_chat          enable row level security;
alter table mensagens_chat       enable row level security;
alter table leituras_chat        enable row level security;
alter table conversas_assistente enable row level security;

-- canais: usuario ve canais da sua organizacao
create policy "ver_canais_org"
  on canais_chat for select
  using (organizacao_id = get_organizacao_id());

-- canais: qualquer membro da org pode criar canais
create policy "criar_canal_org"
  on canais_chat for insert
  with check (organizacao_id = get_organizacao_id());

-- mensagens: usuario ve mensagens de canais da sua org
create policy "ver_mensagens_org"
  on mensagens_chat for select
  using (
    canal_id in (
      select id from canais_chat
      where organizacao_id = get_organizacao_id()
    )
  );

-- mensagens: usuario envia mensagem em canal da sua org
create policy "enviar_mensagem_org"
  on mensagens_chat for insert
  with check (
    autor_id = auth.uid()
    and canal_id in (
      select id from canais_chat
      where organizacao_id = get_organizacao_id()
    )
  );

-- mensagens: usuario edita apenas as proprias dentro de 5 minutos
create policy "editar_propria_mensagem"
  on mensagens_chat for update
  using (
    autor_id = auth.uid()
    and criado_em > now() - interval '5 minutes'
  );

-- leituras: usuario gerencia apenas as proprias
create policy "gerenciar_propria_leitura"
  on leituras_chat for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- assistente: usuario acessa apenas as proprias conversas
create policy "propria_conversa_assistente"
  on conversas_assistente for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
