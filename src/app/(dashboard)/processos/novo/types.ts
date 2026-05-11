import type { ModalidadeLicitacao } from '@/types/database'

export type CategoriaObjeto =
  | 'informatica'
  | 'mobiliario'
  | 'material_consumo'
  | 'veiculos'
  | 'obras'
  | 'servicos_continuados'
  | 'servicos_eventuais'
  | 'saude_medicamentos'
  | 'alimentacao'
  | 'outros'

export type OrigemClausula = 'aprendida' | 'template' | 'ia' | 'vazio'

export interface ItemWizard {
  id: string
  descricao: string
  unidade: string
  quantidade: number
}

export interface DadosWizard {
  secretaria_id: string
  modalidade: ModalidadeLicitacao
  categoria_objeto: CategoriaObjeto
  objeto: string
  problema_atual: string
  impacto_sem_contratar: string
  solucao_proposta: string
  itens: ItemWizard[]
  prazo_dias: number
  normas_aplicaveis: string[]
  especificacoes_minimas: string
  criterios_sustentabilidade: string[]
  valor_estimado: number | null
  forma_pagamento: string
  garantia: string
  prazo_vigencia_meses: number
  sancoes: string
  ia_modelo: 'com_ia' | 'sem_ia'
  clarificacoes: Record<string, string>
}

export interface ProcessoReferencia {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
}

export interface SecaoGerada {
  tipo_campo: string
  texto: string
  origem: OrigemClausula
  processos_referencia: ProcessoReferencia[]
}

export interface DocumentoGerado {
  secoes: SecaoGerada[]
}

export interface DocumentosGerados {
  dfd: DocumentoGerado
  etp: DocumentoGerado
  tr: DocumentoGerado
}

export const DADOS_WIZARD_INICIAL: DadosWizard = {
  secretaria_id: '',
  modalidade: 'pregao_eletronico',
  categoria_objeto: 'outros',
  objeto: '',
  problema_atual: '',
  impacto_sem_contratar: '',
  solucao_proposta: '',
  itens: [],
  prazo_dias: 30,
  normas_aplicaveis: [],
  especificacoes_minimas: '',
  criterios_sustentabilidade: [],
  valor_estimado: null,
  forma_pagamento: '30_dias_medicao',
  garantia: 'dispensada',
  prazo_vigencia_meses: 12,
  sancoes: '',
  ia_modelo: 'com_ia',
  clarificacoes: {},
}

export const LABELS_CATEGORIA: Record<CategoriaObjeto, string> = {
  informatica: 'Equipamentos de Informatica',
  mobiliario: 'Mobiliario',
  material_consumo: 'Material de Consumo',
  veiculos: 'Veiculos',
  obras: 'Obras e Servicos de Engenharia',
  servicos_continuados: 'Servicos Continuados',
  servicos_eventuais: 'Servicos Eventuais',
  saude_medicamentos: 'Saude e Medicamentos',
  alimentacao: 'Alimentacao',
  outros: 'Outros',
}

export const LABELS_MODALIDADE: Record<ModalidadeLicitacao, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia: 'Concorrencia',
  concurso: 'Concurso',
  leilao: 'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa: 'Dispensa de Licitacao',
  inexigibilidade: 'Inexigibilidade',
}