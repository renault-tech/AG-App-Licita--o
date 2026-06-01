-- Restringe a criacao de processos licitatorios por papel.
-- A demanda nasce no setor requisitante (Art. 6, X da Lei 14.133/21). Setores de
-- Compras e Licitacoes apenas revisam e tramitam, nao originam processos.
-- Espelha a constante PODE_CRIAR_PROCESSO em src/lib/permissions.ts.
-- A policy original "criar processo" so validava organizacao_id, permitindo que
-- qualquer membro da organizacao (inclusive procurador, gestor e publicacao)
-- inserisse processos. Esta migration substitui a regra por uma que valida o papel.

drop policy if exists "criar processo" on processos_licitatorios;

create policy "criar processo"
  on processos_licitatorios for insert
  with check (
    organizacao_id = get_organizacao_id()
    and get_papel_usuario() in ('requisitante', 'admin_organizacao', 'admin_plataforma')
  );
