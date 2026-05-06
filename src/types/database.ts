// Tipos gerados manualmente a partir do schema Supabase (supabase/migrations/20260505000000_schema_inicial.sql)
// Para regenerar automaticamente: npx supabase gen types typescript --project-id jqzkfuablvszpmhrzfwq > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PapelUsuario =
  | 'requisitante'
  | 'setor_licitacao'
  | 'procurador'
  | 'autoridade_competente'
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
export type StatusParecer = 'pendente' | 'aprovado' | 'aprovado_com_ressalvas' | 'devolvido'

// -------------------------------------------------------
// Tipos de linha por tabela
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
  responsavel_elaboracao: string
  descricao_necessidade: string
  justificativa: string
  prazo_contratacao: string | null
  observacoes: string | null
  status: StatusDocumento
  gerado_por_ia: boolean
  criado_por: string
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
}

export interface CreditosUsuarioRow {
  id: string
  usuario_id: string
  organizacao_id: string
  saldo: number
  updated_at: string
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

// -------------------------------------------------------
// Database schema (para o Supabase Client)
// -------------------------------------------------------

type TableDef<Row, Insert = Omit<Row, 'id' | 'created_at'>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: any[]
}

export interface Database {
  public: {
    Tables: {
      organizacoes: TableDef<
        OrganizacaoRow,
        Omit<OrganizacaoRow, 'id' | 'created_at'>
      >
      usuarios: TableDef<
        UsuarioRow,
        Omit<UsuarioRow, 'created_at'>
      >
      secretarias: TableDef<
        SecretariaRow,
        Omit<SecretariaRow, 'id'>
      >
      processos_licitatorios: TableDef<
        ProcessoLicitatorioRow,
        Omit<ProcessoLicitatorioRow, 'id' | 'created_at' | 'updated_at'>
      >
      dfd: TableDef<DFDRow, Omit<DFDRow, 'id' | 'created_at' | 'updated_at'>>
      cotacoes: TableDef<CotacaoRow, Omit<CotacaoRow, 'id' | 'created_at' | 'updated_at'>>
      cotacoes_fornecedores: TableDef<{
        id: string
        cotacao_id: string
        nome_fornecedor: string
        cnpj_fornecedor: string | null
        justificativa_escolha: string | null
        pedido_url: string | null
        resposta_url: string | null
        valor_proposto: number | null
      }>
      cotacoes_itens: TableDef<{
        id: string
        cotacao_id: string
        descricao: string
        unidade: string
        quantidade: number
        valor_unitario: number | null
        valor_total: number | null
      }>
      etp: TableDef<ETPRow, Omit<ETPRow, 'id' | 'created_at' | 'updated_at'>>
      termo_referencia: TableDef<TermoReferenciaRow, Omit<TermoReferenciaRow, 'id' | 'created_at' | 'updated_at'>>
      mapa_riscos: TableDef<MapaRiscosRow, Omit<MapaRiscosRow, 'id' | 'created_at' | 'updated_at'>>
      edital: TableDef<EditalRow, Omit<EditalRow, 'id' | 'created_at' | 'updated_at'>>
      pareceres: TableDef<ParecerRow, Omit<ParecerRow, 'id' | 'created_at' | 'updated_at'>>
      versoes_documento: TableDef<{
        id: string
        created_at: string
        tabela_origem: string
        documento_id: string
        organizacao_id: string
        usuario_id: string
        conteudo_snap: Json
        motivo: string | null
      }>
      assinaturas: TableDef<{
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
      }>
      creditos_usuario: TableDef<
        CreditosUsuarioRow,
        Omit<CreditosUsuarioRow, 'id' | 'updated_at'>
      >
      transacoes_credito: TableDef<{
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
      }>
      acoes_ia: TableDef<AcaoIARow, Omit<AcaoIARow, 'id' | 'created_at'>>
      notificacoes: TableDef<{
        id: string
        created_at: string
        usuario_id: string
        organizacao_id: string
        processo_id: string | null
        titulo: string
        mensagem: string
        lida: boolean
        link: string | null
      }>
      secretarias_envolvidas: TableDef<{
        processo_id: string
        secretaria_id: string
        ordem_assinatura: number | null
      }>
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
    }
  }
}
