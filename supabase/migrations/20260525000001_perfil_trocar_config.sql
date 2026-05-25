-- Permite ao admin_plataforma habilitar troca de perfil para admin_organizacao
INSERT INTO configuracoes_plataforma (chave, valor, descricao)
VALUES (
  'admin_org_pode_trocar_perfil',
  'false',
  'Permite que administradores de organizacao troquem o perfil ativo para visualizacao'
)
ON CONFLICT (chave) DO NOTHING;
