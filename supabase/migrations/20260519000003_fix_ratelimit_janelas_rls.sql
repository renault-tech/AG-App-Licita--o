-- Correcao da policy de rate_limit_janelas: negar acesso direto a usuarios comuns
-- Service role bypassa RLS por definicao e continua funcionando normalmente
DROP POLICY IF EXISTS "rate_limit_janelas_service" ON rate_limit_janelas;
CREATE POLICY "rate_limit_janelas_deny_users" ON rate_limit_janelas
  FOR ALL USING (false);
