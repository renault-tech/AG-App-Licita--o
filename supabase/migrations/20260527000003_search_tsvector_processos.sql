-- Adiciona coluna search_vector para busca full-text em processos_licitatorios
-- Usa trigger em vez de GENERATED ALWAYS porque to_tsvector('portuguese', ...) nao e imutavel

ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Funcao que atualiza o search_vector
CREATE OR REPLACE FUNCTION processos_licitatorios_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.numero_processo, '') || ' ' ||
    coalesce(NEW.objeto, '') || ' ' ||
    coalesce(NEW.modalidade::text, '')
  );
  RETURN NEW;
END;
$$;

-- Trigger que chama a funcao antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS trig_processos_search_vector ON processos_licitatorios;
CREATE TRIGGER trig_processos_search_vector
  BEFORE INSERT OR UPDATE OF numero_processo, objeto, modalidade
  ON processos_licitatorios
  FOR EACH ROW
  EXECUTE FUNCTION processos_licitatorios_search_vector_update();

-- Popula a coluna em registros existentes
UPDATE processos_licitatorios
SET search_vector = to_tsvector('portuguese',
  coalesce(numero_processo, '') || ' ' ||
  coalesce(objeto, '') || ' ' ||
  coalesce(modalidade::text, '')
);

-- Indice GIN para busca eficiente
CREATE INDEX IF NOT EXISTS idx_processos_search
  ON processos_licitatorios USING gin(search_vector);
