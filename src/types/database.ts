// Tipos do banco de dados — gerados manualmente a partir do schema em supabase/migrations/
// Para regenerar: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PapelUsuario =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'
  | 'admin_organizacao'
  | 'admin_plataforma'

export type StatusDocumento = 'rascunho' | 'em_revisao' | 'assinado' | 'publicado' | 'devolvido'

export type ModalidadeLicitacao =
  | 'pregao_eletronico'
  | 'pregao_presencial'
  | 'concorrencia'
  | 'concurso'
  | 'leilao'
  | 'dialogo_competitivo'
  | 'dispensa'
  | 'inexigibilidade'

export type TipoAcaoIA = 'aprimorar_texto' | 'sugerir_conteudo' | 'gerar_documento'
export type FonteCotacao = 'pncp' | 'banco_municipal' | 'pesquisa_direta'
export type StatusParecer = 'pendente' | 'em_analise' | 'aprovado' | 'aprovado_com_ressalvas' | 'contrario' | 'devolvido'
export type TipoDFD = 'individual' | 'compartilhado'
export type StatusAdesaoDFD = 'rascunho' | 'aguardando_adesao' | 'prazo_encerrado' | 'consolidado'
export type StatusParticipacaoDFD = 'pendente' | 'aderida' | 'recusada'
export type TipoParticipacaoDFD = 'iniciadora' | 'participante'

// -------------------------------------------------------
// Tipos de linha por tabela (exportados para uso direto)
// -------------------------------------------------------

export interface OrganizacaoRow {
  id: string
  created_at: string
  nome: string
  cnpj: string
  brasao_url: string | null
  cabecalho_institucional: string | null
  rodape_institucional: string | null
  municipio: string
  estado: string
  ativo: boolean
}

export interface UsuarioRow {
  id: string
  created_at: string
  organizacao_id: string
  papel: PapelUsuario
  nome_completo: string
  cargo: string | null
  ativo: boolean
}

export interface SecretariaRow {
  id: string
  organizacao_id: string
  nome: string
  sigla: string | null
  responsavel: string | null
  secretario_nome: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
}

export interface ProcessoLicitatorioRow {
  id: string
  created_at: string
  updated_at: string
  organizacao_id: string
  numero_processo: string | null
  objeto: string
  modalidade: ModalidadeLicitacao
  valor_estimado: number | null
  status: StatusDocumento
  criado_por: string
  etapa_atual: number
}

export interface DFDRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  secretaria_id: string | null
  objeto: string
  justificativa_necessidade: string | null
  tipo: TipoDFD
  status_adesao: StatusAdesaoDFD
  prazo_adesao: string | null
  consolidado_em: string | null
  secretaria_nome: string
  secretaria_email: string | null
  secretaria_telefone: string | null
  secretario_responsavel: string | null
  responsavel_elaboracao: string
  fiscal_contrato: string | null
  dotacao_orcamentaria: string | null
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
}

export interface DFDItemRow {
  id: string
  dfd_id: string
  numero_item: number
  especificacao: string
  unidade_medida: string
  observacoes: string | null
  created_at: string
}

export interface DFDParticipacaoRow {
  id: string
  dfd_id: string
  secretaria_id: string
  tipo: TipoParticipacaoDFD
  status: StatusParticipacaoDFD
  fiscal_contrato: string | null
  dotacao_orcamentaria: string | null
  secretaria_nome: string
  secretaria_email: string | null
  secretaria_telefone: string | null
  secretario_responsavel: string | null
  enviado_em: string | null
  prazo_resposta: string | null
  respondido_em: string | null
  respondido_por: string | null
  created_at: string
}

export interface DFDParticipacaoItemRow {
  id: string
  participacao_id: string
  dfd_item_id: string
  quantidade: number
  observacoes: string | null
}

export interface CotacaoRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  fonte: FonteCotacao
  justificativa_fonte: string | null
  valor_medio: number | null
  valor_mediana: number | null
  valor_estimado: number | null
  tem_outlier: boolean
  status: StatusDocumento
  criado_por: string
}

export interface CotacaoFornecedorRow {
  id: string
  cotacao_id: string
  nome_fornecedor: string
  cnpj_fornecedor: string | null
  justificativa_escolha: string | null
  pedido_url: string | null
  resposta_url: string | null
  valor_proposto: number | null
}

export interface CotacaoItemRow {
  id: string
  cotacao_id: string
  descricao: string
  unidade: string
  quantidade: number
  valor_unitario: number | null
  valor_total: number | null
}

export interface ETPRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  descricao_necessidade: string | null
  requisitos_contratacao: string | null
  levantamento_mercado: string | null
  estimativa_quantidades: string | null
  estimativa_valores: string | null
  justificativa_solucao: string | null
  parcelamento: string | null
  resultados_pretendidos: string | null
  providencias: string | null
  contratacoes_correlatas: string | null
  impactos_ambientais: string | null
  viabilidade: string | null
  analise_risco: Json | null
  conclusao_risco: string | null
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
}

export interface TermoReferenciaRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  objeto: string | null
  fundamentacao: string | null
  descricao: string | null
  requisitos_tecnicos: string | null
  modelo_execucao: string | null
  modelo_gestao: string | null
  criterios_medicao: string | null
  forma_pagamento: string | null
  garantias: string | null
  sancoes: string | null
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
}

export interface MapaRiscosRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  riscos: Json
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
}

export interface EditalRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  conteudo: Json
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
}

export interface ParecerRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  procurador_id: string | null
  conteudo: string | null
  status: StatusParecer
  gerado_por_ia: boolean
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario' | null
  analise_ia: string | null
  ressalvas: string | null
  motivo_contrario: string | null
  data_envio_procuradoria: string | null
}

export type StatusAutorizacao = 'pendente' | 'autorizado' | 'devolvido'

export interface AutorizacaoRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  autorizado_por: string | null
  status: StatusAutorizacao
  observacao: string | null
  autorizado_em: string | null
}

export type StatusPublicacao = 'publicado' | 'suspenso' | 'cancelado' | 'encerrado'

export interface PublicacaoRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  publicado_por: string
  pncp_numero: string | null
  pncp_url: string | null
  diario_oficial: string | null
  portal_proprio: string | null
  data_publicacao: string
  data_abertura: string | null
  status: StatusPublicacao
  observacoes: string | null
}

export interface VersaoDocumentoRow {
  id: string
  created_at: string
  tabela_origem: string
  documento_id: string
  organizacao_id: string
  usuario_id: string
  conteudo_snap: Json
  motivo: string | null
}

export interface AssinaturaRow {
  id: string
  created_at: string
  tabela_origem: string
  documento_id: string
  organizacao_id: string
  usuario_id: string
  provedor: string
  hash_documento: string | null
  timestamp_assinatura: string | null
  status: string
}

export interface CreditosUsuarioRow {
  id: string
  usuario_id: string
  organizacao_id: string
  saldo: number
  updated_at: string
}

export interface TransacaoCreditoRow {
  id: string
  created_at: string
  usuario_id: string
  organizacao_id: string
  tipo: 'compra' | 'consumo' | 'estorno'
  quantidade: number
  saldo_anterior: number
  saldo_posterior: number
  descricao: string | null
  referencia_id: string | null
}

export interface AcaoIARow {
  id: string
  created_at: string
  usuario_id: string
  organizacao_id: string
  processo_id: string | null
  tipo_acao: TipoAcaoIA
  provedor: string
  modelo: string
  tokens_entrada: number
  tokens_saida: number
  creditos_consumidos: number
  input_resumo: string | null
  sucesso: boolean
  erro_mensagem: string | null
}

export interface NotificacaoRow {
  id: string
  created_at: string
  usuario_id: string
  organizacao_id: string
  processo_id: string | null
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
}

export interface SecretariaEnvolvidaRow {
  processo_id: string
  secretaria_id: string
  ordem_assinatura: number | null
}

export interface ConfiguracaoPlataformaRow {
  id: string
  chave: string
  valor: string
  descricao: string | null
  updated_at: string
  updated_by: string | null
}

export interface PrecedenteRow {
  id: string
  parecer_id: string
  organizacao_id: string
  objeto_keywords: string[] | null
  modalidade: string | null
  faixa_valor: string | null
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
  procurador_id: string | null
  emitido_em: string
  participa_pool: boolean
}

export interface PrecedenteComScore {
  id: string
  parecer_id: string
  objeto_processo: string
  modalidade: string | null
  faixa_valor: string | null
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
  procurador_nome: string | null
  emitido_em: string
  score: number
  score_modalidade: number
  score_keywords: number
  score_valor: number
  mesma_org: boolean
  conteudo_parecer: string | null
}

// -------------------------------------------------------
// Database schema para o Supabase Client tipado
// -------------------------------------------------------

type NoRelationships = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}[]

export interface Database {
  public: {
    Tables: {
      organizacoes: {
        Row: OrganizacaoRow
        Insert: Omit<OrganizacaoRow, 'id' | 'created_at'>
        Update: Partial<Omit<OrganizacaoRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      usuarios: {
        Row: UsuarioRow
        Insert: Omit<UsuarioRow, 'created_at'>
        Update: Partial<Omit<UsuarioRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      secretarias: {
        Row: SecretariaRow
        Insert: Omit<SecretariaRow, 'id'>
        Update: Partial<Omit<SecretariaRow, 'id'>>
        Relationships: NoRelationships
      }
      processos_licitatorios: {
        Row: ProcessoLicitatorioRow
        Insert: Omit<ProcessoLicitatorioRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProcessoLicitatorioRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      dfd: {
        Row: DFDRow
        Insert: Omit<DFDRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DFDRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      dfd_itens: {
        Row: DFDItemRow
        Insert: Omit<DFDItemRow, 'id' | 'created_at'>
        Update: Partial<Omit<DFDItemRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      dfd_participacoes: {
        Row: DFDParticipacaoRow
        Insert: Omit<DFDParticipacaoRow, 'id' | 'created_at'>
        Update: Partial<Omit<DFDParticipacaoRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      dfd_participacoes_itens: {
        Row: DFDParticipacaoItemRow
        Insert: Omit<DFDParticipacaoItemRow, 'id'>
        Update: Partial<Omit<DFDParticipacaoItemRow, 'id'>>
        Relationships: NoRelationships
      }
      cotacoes: {
        Row: CotacaoRow
        Insert: Omit<CotacaoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CotacaoRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      cotacoes_fornecedores: {
        Row: CotacaoFornecedorRow
        Insert: Omit<CotacaoFornecedorRow, 'id'>
        Update: Partial<Omit<CotacaoFornecedorRow, 'id'>>
        Relationships: NoRelationships
      }
      cotacoes_itens: {
        Row: CotacaoItemRow
        Insert: Omit<CotacaoItemRow, 'id'>
        Update: Partial<Omit<CotacaoItemRow, 'id'>>
        Relationships: NoRelationships
      }
      etp: {
        Row: ETPRow
        Insert: Omit<ETPRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ETPRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      termo_referencia: {
        Row: TermoReferenciaRow
        Insert: Omit<TermoReferenciaRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TermoReferenciaRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      mapa_riscos: {
        Row: MapaRiscosRow
        Insert: Omit<MapaRiscosRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MapaRiscosRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      edital: {
        Row: EditalRow
        Insert: Omit<EditalRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EditalRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      pareceres: {
        Row: ParecerRow
        Insert: Omit<ParecerRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ParecerRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      versoes_documento: {
        Row: VersaoDocumentoRow
        Insert: Omit<VersaoDocumentoRow, 'id' | 'created_at'>
        Update: Partial<Omit<VersaoDocumentoRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      assinaturas: {
        Row: AssinaturaRow
        Insert: Omit<AssinaturaRow, 'id' | 'created_at'>
        Update: Partial<Omit<AssinaturaRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      creditos_usuario: {
        Row: CreditosUsuarioRow
        Insert: Omit<CreditosUsuarioRow, 'id' | 'updated_at'>
        Update: Partial<Omit<CreditosUsuarioRow, 'id' | 'updated_at'>>
        Relationships: NoRelationships
      }
      transacoes_credito: {
        Row: TransacaoCreditoRow
        Insert: Omit<TransacaoCreditoRow, 'id' | 'created_at'>
        Update: Partial<Omit<TransacaoCreditoRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      acoes_ia: {
        Row: AcaoIARow
        Insert: Omit<AcaoIARow, 'id' | 'created_at'>
        Update: Partial<Omit<AcaoIARow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      notificacoes: {
        Row: NotificacaoRow
        Insert: Omit<NotificacaoRow, 'id' | 'created_at'>
        Update: Partial<Omit<NotificacaoRow, 'id' | 'created_at'>>
        Relationships: NoRelationships
      }
      secretarias_envolvidas: {
        Row: SecretariaEnvolvidaRow
        Insert: SecretariaEnvolvidaRow
        Update: Partial<SecretariaEnvolvidaRow>
        Relationships: NoRelationships
      }
      autorizacoes: {
        Row: AutorizacaoRow
        Insert: Omit<AutorizacaoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AutorizacaoRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      publicacoes: {
        Row: PublicacaoRow
        Insert: Omit<PublicacaoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PublicacaoRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: NoRelationships
      }
      permissoes_papel_organizacao: {
        Row: PermissaoPapelRow
        Insert: Omit<PermissaoPapelRow, 'id' | 'updated_at'>
        Update: Partial<Omit<PermissaoPapelRow, 'id'>>
        Relationships: NoRelationships
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      papel_usuario: PapelUsuario
      status_documento: StatusDocumento
      modalidade_licitacao: ModalidadeLicitacao
      tipo_acao_ia: TipoAcaoIA
      fonte_cotacao: FonteCotacao
      status_parecer: StatusParecer
      tipo_dfd: TipoDFD
      status_adesao_dfd: StatusAdesaoDFD
      status_participacao_dfd: StatusParticipacaoDFD
      tipo_participacao_dfd: TipoParticipacaoDFD
    }
  }
}

export interface ClausulaPadraoRow {
  id: string
  tipo_campo: string
  documento: 'dfd' | 'etp' | 'tr'
  modalidade: string | null
  categoria_objeto: string | null
  texto_template: string
  variaveis: string[]
  versao: number
  ativo: boolean
  criado_em: string
}

export interface ClausulaAprendidaRow {
  id: string
  organizacao_id: string
  tipo_campo: string
  documento: 'dfd' | 'etp' | 'tr'
  modalidade: string | null
  categoria_objeto: string | null
  texto_original: string
  texto_aprovado: string
  processos_referencia: string[]
  uso_count: number
  score_qualidade: number
  ultima_vez_em: string
  criado_em: string
}

export interface PermissaoPapelRow {
  id: string
  organizacao_id: string
  papel: PapelUsuario
  tab_slug: string
  pode_ver: boolean
  pode_editar: boolean
  updated_at: string
}

// -------------------------------------------------------
// Tipos de tramitacao e fluxo de fases
// -------------------------------------------------------

export type FaseProcesso =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'

export type TipoTramitacao = 'avanco' | 'devolucao'

export interface TramitacaoHistoricoRow {
  id: string
  processo_id: string
  organizacao_id: string
  usuario_id: string
  nome_usuario: string
  de_papel: FaseProcesso
  para_papel: FaseProcesso
  tipo: TipoTramitacao
  motivo: string | null
  pendencias: string[] | null
  created_at: string
}
