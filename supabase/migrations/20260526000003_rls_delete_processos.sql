-- Adiciona politica RLS de DELETE na tabela processos_licitatorios.
-- Somente admin_organizacao e admin_plataforma podem excluir processos,
-- e apenas dentro da propria organizacao.
-- Processos publicados sao bloqueados tambem na camada de aplicacao.

create policy "excluir processo admin"
  on processos_licitatorios for delete
  using (
    organizacao_id = get_organizacao_id()
    and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma')
  );
