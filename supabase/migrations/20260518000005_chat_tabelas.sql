-- supabase/migrations/20260518000005_chat_tabelas.sql
-- ============================================================
-- Chat interno -- 3 modos: por processo, por setor, direto
-- RLS: usuario so ve mensagens da sua organizacao e do seu papel/processo
-- ============================================================

-- ---- Chat do Processo ----
CREATE TABLE mensagens_processo (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     uuid        NOT NULL REFERENCES processos_licitatorios(id) ON DELETE CASCADE,
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid        NOT NULL REFERENCES auth.users(id),
  nome_usuario    text        NOT NULL,
  papel_usuario   papel_usuario NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_processo_processo ON mensagens_processo(processo_id, created_at DESC);

ALTER TABLE mensagens_processo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_processo_select" ON mensagens_processo
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "msg_processo_insert" ON mensagens_processo
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND usuario_id = auth.uid()
  );

-- ---- Chat do Setor ----
CREATE TABLE mensagens_setor (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  setor           papel_usuario NOT NULL,
  usuario_id      uuid        NOT NULL REFERENCES auth.users(id),
  nome_usuario    text        NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_setor_setor ON mensagens_setor(organizacao_id, setor, created_at DESC);

ALTER TABLE mensagens_setor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_setor_select" ON mensagens_setor
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND setor = (SELECT papel FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "msg_setor_insert" ON mensagens_setor
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND usuario_id = auth.uid()
    AND setor = (SELECT papel FROM usuarios WHERE id = auth.uid())
  );

-- ---- Mensagens Diretas ----
CREATE TABLE mensagens_diretas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  de_usuario_id   uuid        NOT NULL REFERENCES auth.users(id),
  para_usuario_id uuid        NOT NULL REFERENCES auth.users(id),
  nome_remetente  text        NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  lida            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_direta_diferentes_usuarios CHECK (de_usuario_id <> para_usuario_id)
);

CREATE INDEX idx_mensagens_diretas_conversa ON mensagens_diretas(
  organizacao_id,
  LEAST(de_usuario_id, para_usuario_id),
  GREATEST(de_usuario_id, para_usuario_id),
  created_at DESC
);

ALTER TABLE mensagens_diretas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_direta_select" ON mensagens_diretas
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND (de_usuario_id = auth.uid() OR para_usuario_id = auth.uid())
  );

CREATE POLICY "msg_direta_insert" ON mensagens_diretas
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND de_usuario_id = auth.uid()
  );

CREATE POLICY "msg_direta_update" ON mensagens_diretas
  FOR UPDATE USING (para_usuario_id = auth.uid())
  WITH CHECK (para_usuario_id = auth.uid());
