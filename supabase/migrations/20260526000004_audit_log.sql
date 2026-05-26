create table audit_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  usuario_id     uuid references usuarios(id) on delete set null,
  nome_usuario   text not null,
  papel_usuario  text not null,
  categoria      text not null check (categoria in ('processo', 'documento', 'usuario', 'organizacao')),
  acao           text not null,
  recurso_id     uuid,
  recurso_desc   text,
  detalhes       jsonb
);

create index idx_audit_log_org_created on audit_log (organizacao_id, created_at desc);
create index idx_audit_log_usuario     on audit_log (organizacao_id, usuario_id);
create index idx_audit_log_categoria   on audit_log (organizacao_id, categoria);

alter table audit_log enable row level security;

-- Somente admins da propria organizacao podem ler
create policy "audit_log leitura admin"
  on audit_log for select
  using (
    organizacao_id = get_organizacao_id()
    and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma')
  );

-- Sem policy de INSERT para usuarios — escrita exclusiva via service role no helper
