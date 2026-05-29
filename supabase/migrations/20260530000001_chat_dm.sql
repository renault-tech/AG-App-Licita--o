-- Adiciona suporte a canais de mensagem direta (DM) entre usuarios

-- Atualiza o CHECK constraint do tipo para incluir 'dm'
ALTER TABLE canais_chat
  DROP CONSTRAINT IF EXISTS canais_chat_tipo_check;

ALTER TABLE canais_chat
  ADD CONSTRAINT canais_chat_tipo_check
  CHECK (tipo IN ('processo', 'setor', 'plataforma', 'dm'));

-- Tabela pivot: participantes de canais DM
CREATE TABLE IF NOT EXISTS canais_dm_participantes (
  canal_id    uuid NOT NULL REFERENCES canais_chat(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (canal_id, usuario_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS canais_dm_participantes_usuario_idx
  ON canais_dm_participantes(usuario_id);

-- RLS
ALTER TABLE canais_dm_participantes ENABLE ROW LEVEL SECURITY;

-- Usuario ve apenas os canais DM em que participa
CREATE POLICY "participante_ve_proprio_dm" ON canais_dm_participantes
  FOR SELECT USING (usuario_id = auth.uid());

-- Usuario pode se inserir como participante (garantirCanalDM cria o canal server-side)
CREATE POLICY "participante_insere_proprio_dm" ON canais_dm_participantes
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- RLS em canais_chat: usuario ve canal DM se for participante
-- (complementa a policy existente baseada em organizacao_id)
DROP POLICY IF EXISTS "usuario_ve_canais_dm" ON canais_chat;
CREATE POLICY "usuario_ve_canais_dm" ON canais_chat
  FOR SELECT USING (
    tipo = 'dm' AND EXISTS (
      SELECT 1 FROM canais_dm_participantes
      WHERE canal_id = canais_chat.id
        AND usuario_id = auth.uid()
    )
  );
