CREATE TABLE IF NOT EXISTS dashboard_preferencias (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  config_key     text NOT NULL,
  config_value   jsonb NOT NULL DEFAULT '{}',
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, config_key)
);

ALTER TABLE dashboard_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proprias preferencias" ON dashboard_preferencias
  FOR ALL USING (usuario_id = auth.uid());
