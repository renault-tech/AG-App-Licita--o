CREATE TABLE clausulas_aprendidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo_campo text NOT NULL,
  documento text NOT NULL CHECK (documento IN ('dfd','etp','tr')),
  modalidade text,
  categoria_objeto text,
  texto_original text NOT NULL,
  texto_aprovado text NOT NULL,
  processos_referencia uuid[] DEFAULT '{}',
  uso_count int DEFAULT 1,
  score_qualidade numeric DEFAULT 1.0,
  ultima_vez_em timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_clausulas_aprendidas_lookup
  ON clausulas_aprendidas (organizacao_id, documento, tipo_campo, modalidade, categoria_objeto);

ALTER TABLE clausulas_aprendidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own" ON clausulas_aprendidas
  USING (organizacao_id = (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
