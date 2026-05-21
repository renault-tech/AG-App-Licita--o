create table if not exists ticker_preferencias (
  usuario_id    uuid primary key references usuarios(id) on delete cascade,
  categorias    jsonb not null default '{
    "movimentacao": true,
    "etapa": true,
    "parecer": true,
    "assinatura": true,
    "publicacao": true,
    "sessao": true,
    "ia": true
  }'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table ticker_preferencias enable row level security;

create policy "usuario_le_propria_preferencia"
  on ticker_preferencias for select
  using (auth.uid() = usuario_id);

create policy "usuario_insere_propria_preferencia"
  on ticker_preferencias for insert
  with check (auth.uid() = usuario_id);

create policy "usuario_atualiza_propria_preferencia"
  on ticker_preferencias for update
  using (auth.uid() = usuario_id);
