-- ============================================================
-- Vinculo usuario <-> secretaria + correcao da RLS de notificacoes
-- ============================================================
-- Contexto:
--   1. O fluxo de compra compartilhada (DFD com adesao de secretarias)
--      precisa saber a qual secretaria o usuario pertence para distinguir
--      a secretaria iniciadora das participantes. Ate aqui nao havia esse
--      vinculo e o codigo usava "a primeira secretaria ativa da org" como
--      fallback, atribuindo o papel errado a quase todos os usuarios.
--   2. A policy de notificacoes era "for all using (usuario_id = auth.uid())",
--      o que bloqueava silenciosamente a insercao de notificacoes para
--      OUTROS usuarios (convites, avisos, tramitacao). Como a notificacao e o
--      unico canal de descoberta de convites, o destinatario nunca era avisado.
-- ============================================================

-- 1. Vincula usuario a uma secretaria (opcional; nem todo usuario pertence a uma)
alter table usuarios
  add column if not exists secretaria_id uuid references secretarias(id) on delete set null;

create index if not exists idx_usuarios_secretaria on usuarios(secretaria_id);

-- 2. Corrige a RLS de notificacoes
--    Leitura/atualizacao continuam restritas ao dono da notificacao,
--    mas a insercao passa a ser permitida para qualquer usuario autenticado
--    da mesma organizacao (a coluna organizacao_id ja e NOT NULL).
drop policy if exists "notificacoes proprias" on notificacoes;

create policy "notificacoes leitura propria"
  on notificacoes for select
  using (usuario_id = auth.uid());

create policy "notificacoes atualizacao propria"
  on notificacoes for update
  using (usuario_id = auth.uid());

create policy "notificacoes insercao na organizacao"
  on notificacoes for insert
  with check (organizacao_id = get_organizacao_id());

create policy "notificacoes remocao propria"
  on notificacoes for delete
  using (usuario_id = auth.uid());
