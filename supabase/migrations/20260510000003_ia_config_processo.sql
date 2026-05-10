ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS ia_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS categoria_objeto text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES secretarias(id);
