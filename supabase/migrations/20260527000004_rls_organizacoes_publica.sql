-- Permite que usuários não autenticados (anon) listem organizações ativas
-- Necessário para o fluxo de cadastro, onde o usuário precisa escolher
-- a prefeitura antes de ter uma conta criada.
-- A política existente "usuarios veem propria organizacao" permanece para
-- a role authenticated, restringindo o acesso ao tenant correto.
create policy "anon pode listar organizacoes ativas"
  on organizacoes for select
  to anon
  using (ativo = true and is_demo = false);
