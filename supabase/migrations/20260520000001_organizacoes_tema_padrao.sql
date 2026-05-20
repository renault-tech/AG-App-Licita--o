-- Adiciona campo de tema padrao por organizacao (Fase 6 - Design System)
-- Permite que cada prefeitura configure sua paleta visual padrao

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS tema_padrao TEXT NOT NULL DEFAULT 'petroleo'
  CHECK (tema_padrao IN ('petroleo', 'grafite', 'brasao', 'noite', 'cataguases'));

COMMENT ON COLUMN organizacoes.tema_padrao IS 'Tema visual padrao da plataforma para esta organizacao. Usuarios podem sobrescrever individualmente via localStorage.';
