-- Recria get_organizacao_id() e get_papel_usuario() com SECURITY DEFINER.
-- Sem SECURITY DEFINER, as funcoes rodam como o usuario anon, que precisa
-- de RLS para acessar usuarios, o que chama as funcoes novamente, criando
-- recursao circular que resulta em data: null silencioso no cliente.
CREATE OR REPLACE FUNCTION get_organizacao_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_papel_usuario()
RETURNS papel_usuario
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT papel FROM usuarios WHERE id = auth.uid()
$$;
