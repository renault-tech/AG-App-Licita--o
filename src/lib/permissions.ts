import type { PapelUsuario } from '@/types/database'

// Roles que podem criar novos processos licitatorios
export const PODE_CRIAR_PROCESSO: PapelUsuario[] = [
  'requisitante', 'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem editar documentos do wizard (DFD, ETP, TR, Cotacao, Riscos)
export const PODE_EDITAR_DOCUMENTOS: PapelUsuario[] = [
  'requisitante', 'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Tabs do processo visiveis para cada papel (slugs das etapas)
export const TABS_VISIVEIS_POR_PAPEL: Record<PapelUsuario, string[]> = {
  requisitante:      ['dfd', 'cotacao', 'etp', 'tr', 'riscos'],
  setor_compras:     ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'revisao'],
  setor_licitacao:   ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  procurador:        ['parecer'],
  gestor_publico:    ['autorizacao'],
  publicacao:        ['publicacao'],
  admin_organizacao: ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  admin_plataforma:  ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
}

// Roles que acessam apenas sua aba designada (sem ver o pipeline completo)
export const ACESSO_RESTRITO_PROCESSO: PapelUsuario[] = [
  'procurador', 'gestor_publico', 'publicacao',
]

// Roles que fazem a primeira revisao (Setor de Compras)
export const PODE_REVISAR_COMPRAS: PapelUsuario[] = [
  'setor_compras', 'admin_organizacao', 'admin_plataforma',
]

// Roles que fazem a segunda revisao e geram Edital/Oficio (Setor de Licitacoes)
export const PODE_REVISAR_LICITACOES: PapelUsuario[] = [
  'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem emitir parecer juridico (Art. 53 da Lei 14.133/21)
export const PODE_EMITIR_PARECER: PapelUsuario[] = [
  'procurador', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem autorizar a abertura do certame (Art. 72)
export const PODE_AUTORIZAR: PapelUsuario[] = [
  'gestor_publico', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem registrar publicacao no portal
export const PODE_PUBLICAR: PapelUsuario[] = [
  'publicacao', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem acessar configuracoes da organizacao
export const PODE_CONFIGURAR: PapelUsuario[] = [
  'admin_organizacao', 'admin_plataforma',
]

/** Verifica se um papel tem uma determinada permissao. admin_plataforma sempre retorna true. */
export function podeFazer(
  papel: PapelUsuario | null | undefined,
  permissao: PapelUsuario[]
): boolean {
  if (!papel) return false
  if (papel === 'admin_plataforma') return true
  return permissao.includes(papel)
}

/**
 * Retorna a tab designada para papeis com acesso restrito ao processo.
 * Retorna null para papeis com acesso completo ao pipeline.
 */
export function getTabDesignada(papel: PapelUsuario): string | null {
  if (papel === 'procurador') return 'parecer'
  if (papel === 'gestor_publico') return 'autorizacao'
  if (papel === 'publicacao') return 'publicacao'
  return null
}

/** Label legivel de cada papel para exibicao em UI. */
export const LABEL_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      'Requisitante',
  setor_compras:     'Setor de Compras',
  setor_licitacao:   'Setor de Licitações',
  procurador:        'Procuradoria',
  gestor_publico:    'Gestor Público',
  publicacao:        'Publicação',
  admin_organizacao: 'Administrador',
  admin_plataforma:  'Admin da Plataforma',
}

/** Cor de badge por papel, usada na timeline e no chat. */
export const COR_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      '#3B82F6',
  setor_compras:     '#F59E0B',
  setor_licitacao:   '#7C3AED',
  procurador:        '#DC2626',
  gestor_publico:    '#059669',
  publicacao:        '#16A34A',
  admin_organizacao: '#475569',
  admin_plataforma:  '#1E293B',
}

/** Icone emoji por papel, usado na timeline visual do processo. */
export const ICONE_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      '📝',
  setor_compras:     '🛒',
  setor_licitacao:   '⚖️',
  procurador:        '🏛️',
  gestor_publico:    '🤝',
  publicacao:        '📢',
  admin_organizacao: '⚙️',
  admin_plataforma:  '🔑',
}

/** Ordem dos papeis no fluxo de tramitacao (usado na timeline). */
export const ORDEM_FLUXO: PapelUsuario[] = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
]
