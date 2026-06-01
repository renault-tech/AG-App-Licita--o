-- Migration: creditos_iniciais_gratuitos
-- Objetivo: garantir que todos os usuarios tenham creditos iniciais e que
-- usuarios existentes com saldo 0 e sem transacoes recebam o bonus de boas-vindas.
-- Conforme o novo modelo: providers gratuitos (Gemini, Groq) nao consomem
-- creditos, mas o saldo eh usado para providers pagos.

-- 0. Expandir constraint de tipo para incluir 'bonus'
alter table transacoes_credito drop constraint if exists transacoes_credito_tipo_check;
alter table transacoes_credito add constraint transacoes_credito_tipo_check
  check (tipo = any (array['compra'::text, 'consumo'::text, 'estorno'::text, 'bonus'::text]));

-- 1. Provisionar creditos para usuarios que ainda nao tem registro
insert into creditos_usuario (usuario_id, organizacao_id, saldo)
select
  u.id,
  u.organizacao_id,
  500 -- CREDITOS_BOAS_VINDAS
from usuarios u
left join creditos_usuario cu on cu.usuario_id = u.id
where cu.id is null
  and u.organizacao_id is not null;

-- 2. Corrigir usuarios que existem com saldo 0 e sem nenhuma transacao de boas-vindas.
-- Esses sao usuarios criados pelo admin antes desta correcao.
update creditos_usuario cu
set
  saldo      = 500,
  updated_at = now()
from usuarios u
where cu.usuario_id = u.id
  and cu.saldo = 0
  and not exists (
    select 1
    from transacoes_credito tc
    where tc.usuario_id = cu.usuario_id
  );

-- 3. Registrar transacoes de boas-vindas retroativas para usuarios corrigidos acima
-- (apenas quem ainda nao tem nenhuma transacao)
insert into transacoes_credito (
  usuario_id,
  organizacao_id,
  tipo,
  quantidade,
  saldo_anterior,
  saldo_posterior,
  descricao,
  referencia_externa,
  provedor
)
select
  cu.usuario_id,
  cu.organizacao_id,
  'bonus',
  500,
  0,
  500,
  'Creditos gratuitos de boas-vindas (retroativo)',
  'boas-vindas-' || cu.usuario_id::text,
  'manual'
from creditos_usuario cu
where cu.saldo = 500
  and not exists (
    select 1
    from transacoes_credito tc
    where tc.usuario_id = cu.usuario_id
  );
