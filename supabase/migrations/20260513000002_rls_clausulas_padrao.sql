-- ============================================================
-- LicitaIA - Correção de Segurança: RLS em clausulas_padrao
-- Advisor: "RLS Disabled in Public" — clausulas_padrao
-- ============================================================

-- Habilitar RLS na tabela
alter table clausulas_padrao enable row level security;

-- Política de leitura: qualquer usuário autenticado pode ler cláusulas ativas
-- (tabela de templates é compartilhada — não é por organização)
create policy "usuarios autenticados leem clausulas_padrao"
  on clausulas_padrao for select
  using (auth.uid() is not null);

-- Política de escrita: apenas admin_plataforma pode inserir/atualizar/deletar
create policy "admin_plataforma gerencia clausulas_padrao"
  on clausulas_padrao for all
  using (get_papel_usuario() = 'admin_plataforma');
