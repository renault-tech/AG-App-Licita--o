-- Tabela de convites para cadastro de novas prefeituras.
-- Criados pelo Admin Master, enviados por e-mail ao futuro admin da org.
-- Token UUID e valido por 7 dias apos criacao.

CREATE TABLE convites_organizacao (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token           uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  criado_por      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  email_destino   text NOT NULL,
  nome_prefeitura text,
  municipio       text,
  estado          char(2),
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'aceito', 'revogado', 'expirado')),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE convites_organizacao ENABLE ROW LEVEL SECURITY;

-- Somente admin_plataforma pode ver e manipular convites
CREATE POLICY "admin plataforma gerencia convites"
  ON convites_organizacao
  FOR ALL
  USING (get_papel_usuario() = 'admin_plataforma');

-- Leitura publica do token para validacao na pagina de cadastro (sem RLS bypass)
-- A pagina de convite usa createServiceClient para validar o token sem sessao.

CREATE INDEX idx_convites_token ON convites_organizacao(token) WHERE status = 'pendente';
CREATE INDEX idx_convites_criado_por ON convites_organizacao(criado_por);
