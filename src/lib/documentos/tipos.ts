export interface CabecalhoDoc {
  municipio: string
  estado: string
  nomeOrganizacao: string
  nomeSecretaria: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  brasaoUrl: string | null
  geradoPorIA: boolean
  corPrimaria: string
}

export interface SecaoDoc {
  titulo: string
  conteudo: string
}

export interface PayloadDocumento {
  cabecalho: CabecalhoDoc
  tipoDocumento: string
  numeroProcesso: string | null
  objeto: string
  modalidade: string
  dataGeracao: string
  secoes: SecaoDoc[]
  rodapeIA: boolean
  /** Status do documento na tabela de origem: determina exibicao da marca d'agua MINUTA */
  statusDocumento: string | null
}
