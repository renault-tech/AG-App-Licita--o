-- ============================================================
-- LicitaIA - Auditoria de Segurança: RLS em tabelas faltantes
-- Corrige todos os alertas "RLS Disabled in Public" do Advisor
-- Versão corrigida: remove permissoes_papel_organizacao (não existe)
-- ============================================================

-- clausulas_aprendidas
alter table clausulas_aprendidas enable row level security;

create policy "usuarios autenticados leem clausulas_aprendidas"
  on clausulas_aprendidas for select
  using (auth.uid() is not null);

create policy "admin_plataforma gerencia clausulas_aprendidas"
  on clausulas_aprendidas for all
  using (get_papel_usuario() = 'admin_plataforma');

-- documentos_base (Base de Conhecimento)
alter table documentos_base enable row level security;

create policy "usuarios autenticados leem documentos_base"
  on documentos_base for select
  using (auth.uid() is not null);

create policy "admin_plataforma gerencia documentos_base"
  on documentos_base for all
  using (get_papel_usuario() = 'admin_plataforma');

-- clausulas_aplicadas
alter table clausulas_aplicadas enable row level security;

create policy "usuarios autenticados leem clausulas_aplicadas"
  on clausulas_aplicadas for select
  using (auth.uid() is not null);

create policy "usuarios autenticados inserem clausulas_aplicadas"
  on clausulas_aplicadas for insert
  with check (auth.uid() is not null);

-- configuracoes_plataforma
alter table configuracoes_plataforma enable row level security;

create policy "usuarios autenticados leem configuracoes_plataforma"
  on configuracoes_plataforma for select
  using (auth.uid() is not null);

create policy "admin_plataforma gerencia configuracoes_plataforma"
  on configuracoes_plataforma for all
  using (get_papel_usuario() = 'admin_plataforma');

-- pareceres_precedentes
alter table pareceres_precedentes enable row level security;

create policy "usuarios autenticados leem pareceres_precedentes"
  on pareceres_precedentes for select
  using (auth.uid() is not null);

create policy "admin_plataforma gerencia pareceres_precedentes"
  on pareceres_precedentes for all
  using (get_papel_usuario() = 'admin_plataforma');
