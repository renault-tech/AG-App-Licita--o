-- A coluna justificativa existia no schema original como NOT NULL.
-- Com o novo modelo, ela foi substituida por justificativa_necessidade.
-- Adicionamos default vazio para nao quebrar INSERTs sem esse campo.
alter table dfd alter column justificativa set default '';
alter table dfd alter column justificativa drop not null;