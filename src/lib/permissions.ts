import type { PapelUsuario } from '@/types/database'

// Roles que podem criar novos processos licitatorios
export const PODE_CRIAR_PROCESSO: PapelUsuario[] = [
  'requisitante', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem editar documentos (DFD, ETP, TR, Edital, Cotacao, Riscos)
export const PODE_EDITAR_DOCUMENTOS: PapelUsuario[] = [
  'requisitante', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Tabs do processo visiveis para cada papel (slugs das etapas)
export const TABS_VISIVEIS_POR_PAPEL: Record<string, string[]> = {
  requisitante:          ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital'],
  setor_licitacao:       ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  procurador:            ['parecer'],
  autoridade_competente: ['autorizacao'],
  admin_organizacao:     ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  admin_plataforma:      ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
}

// Roles que acessam apenas sua aba designada no processo (sem ver o pipeline completo)
export const ACESSO_RESTRITO_PROCESSO: PapelUsuario[] = [
  'procurador', 'autoridade_competente',
]

// Roles que podem aprovar/devolver documentos na etapa de revisao
export const PODE_REVISAR: PapelUsuario[] = [
  'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem emitir parecer juridico (Art. 53)
export const PODE_EMITIR_PARECER: PapelUsuario[] = [
  'procurador', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem autorizar a abertura do certame (Art. 72)
export const PODE_AUTORIZAR: PapelUsuario[] = [
  'autoridade_competente', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem registrar publicacao
export const PODE_PUBLICAR: PapelUsuario[] = [
  'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem acessar configuracoes da organizacao
export const PODE_CONFIGURAR: PapelUsuario[] = [
  'admin_organizacao', 'admin_plataforma',
]

/** Verifica se um papel tem uma determinada permissao. */
export function podeFazer(
  papel: PapelUsuario | null | undefined,
  permissao: PapelUsuario[]
): boolean {
  if (!papel) return false
  return permissao.includes(papel)
}

/**
 * Retorna a tab designada para papeis com acesso restrito ao processo.
 * Retorna null para papeis com acesso completo.
 */
export function getTabDesignada(papel: PapelUsuario): string | null {
  if (papel === 'procurador') return 'parecer'
  if (papel === 'autoridade_competente') return 'autorizacao'
  return null
}

/** Label legivel de cada papel para exibicao em UI. */
export const LABEL_PAPEL: Record<PapelUsuario, string> = {
  requisitante:          'Requisitante',
  setor_licitacao:       'Setor de Licitacoes',
  procurador:            'Procurador',
  autoridade_competente: 'Autoridade Competente',
  admin_organizacao:     'Administrador',
  admin_plataforma:      'Admin da Plataforma',
}