-- ============================================================
-- Fase 1 do epico "Manifestacao de secretarias antes do wizard"
-- Unificacao no modelo DFD. Mudancas ADITIVAS (nao remove avisos_*,
-- que serao aposentados na Fase 2 quando o substituto DFD-first existir).
--
-- Introduz o conceito de "rito" da manifestacao compartilhada:
--   - 'irp'          Intencao de Registro de Precos (Art. 86 a 88 da Lei
--                    14.133/21 + Decreto 11.462/2023), quando o processo
--                    usa Sistema de Registro de Precos.
--   - 'consolidacao' Consolidacao de demandas de varias secretarias num
--                    DFD unico (Art. 6, X), para as demais contratacoes.
-- O rito so e relevante quando dfd.tipo = 'compartilhado'.
-- ============================================================

-- 1. Flag de Registro de Precos no processo (ortogonal a modalidade, Art. 82)
alter table processos_licitatorios
  add column if not exists registro_de_precos boolean not null default false;

comment on column processos_licitatorios.registro_de_precos is
  'Indica uso do Sistema de Registro de Precos (Art. 82 da Lei 14.133/21). Define o rito da manifestacao das secretarias no DFD compartilhado.';

-- 2. Enum do rito da manifestacao compartilhada
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rito_dfd') then
    create type rito_dfd as enum ('irp', 'consolidacao');
  end if;
end$$;

-- 3. Coluna rito no DFD. Default 'consolidacao' preserva o comportamento atual.
alter table dfd
  add column if not exists rito rito_dfd not null default 'consolidacao';

comment on column dfd.rito is
  'Rito da manifestacao quando tipo = compartilhado: irp (registro de precos) ou consolidacao (DFD unico). Ignorado quando tipo = individual.';

-- 4. IRP: permitir adesao posterior a ata por orgaos nao participantes ("carona"),
--    conforme Art. 32 do Decreto 11.462/2023. So aplicavel ao rito irp.
alter table dfd
  add column if not exists permite_adesao_posterior boolean not null default false;

comment on column dfd.permite_adesao_posterior is
  'IRP: autoriza adesao posterior a ata por orgaos nao participantes (carona), Art. 32 do Decreto 11.462/2023.';
