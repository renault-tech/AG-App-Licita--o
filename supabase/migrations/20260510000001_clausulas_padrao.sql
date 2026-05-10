CREATE TABLE clausulas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_campo text NOT NULL,
  documento text NOT NULL CHECK (documento IN ('dfd','etp','tr')),
  modalidade text,
  categoria_objeto text,
  texto_template text NOT NULL,
  variaveis jsonb DEFAULT '[]'::jsonb,
  versao int DEFAULT 1,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_clausulas_padrao_lookup
  ON clausulas_padrao (documento, tipo_campo, modalidade, categoria_objeto)
  WHERE ativo = true;
