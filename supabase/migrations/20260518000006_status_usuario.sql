-- supabase/migrations/20260518000006_status_usuario.sql
CREATE TYPE status_aprovacao_usuario AS ENUM (
  'aguardando_aprovacao',
  'ativo',
  'recusado',
  'suspenso'
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS status_aprovacao status_aprovacao_usuario
  NOT NULL DEFAULT 'ativo';

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS papel_solicitado papel_usuario;

CREATE INDEX idx_usuarios_status_org
  ON usuarios(organizacao_id, status_aprovacao);
