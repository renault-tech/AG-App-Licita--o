'use server'

import { createClient } from '@/lib/supabase/server'
import type { PayloadDocumento, CabecalhoDoc } from './tipos'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregao Eletronico',
  pregao_presencial:   'Pregao Presencial',
  concorrencia:        'Concorrencia',
  concurso:            'Concurso',
  leilao:              'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

async function buscarCabecalho(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizacaoId: string,
  secretariaId: string | null
): Promise<CabecalhoDoc> {
  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('nome, municipio, estado, endereco, telefone, email, brasao_url, cabecalho_institucional')
    .eq('id', organizacaoId)
    .maybeSingle()

  let nomeSecretaria: string | null = null
  if (secretariaId) {
    const { data: sec } = await (supabase as any)
      .from('secretarias')
      .select('nome')
      .eq('id', secretariaId)
      .maybeSingle()
    nomeSecretaria = sec?.nome ?? null
  }

  return {
    municipio:        org?.municipio ?? '',
    estado:           org?.estado ?? '',
    nomeOrganizacao:  org?.cabecalho_institucional ?? org?.nome ?? '',
    nomeSecretaria,
    endereco:         org?.endereco ?? null,
    telefone:         org?.telefone ?? null,
    email:            org?.email ?? null,
    brasaoUrl:        org?.brasao_url ?? null,
    geradoPorIA:      false,
  }
}

export async function montarPayloadDFD(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dfd } = await (supabase as any)
    .from('dfd')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!dfd) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, dfd.secretaria_id)
  cabecalho.geradoPorIA = dfd.gerado_por_ia ?? false

  const secoes = [
    { titulo: '1. Identificacao do Responsavel pela Elaboracao', conteudo: dfd.responsavel_elaboracao ?? '' },
    { titulo: '2. Descricao da Necessidade (Objeto da Contratacao)', conteudo: dfd.descricao_necessidade ?? '' },
    { titulo: '3. Justificativa da Contratacao', conteudo: dfd.justificativa ?? '' },
    dfd.prazo_contratacao ? { titulo: '4. Prazo Esperado de Contratacao', conteudo: dfd.prazo_contratacao } : null,
    dfd.observacoes ? { titulo: '5. Observacoes Adicionais', conteudo: dfd.observacoes } : null,
  ].filter(Boolean) as { titulo: string; conteudo: string }[]

  return {
    cabecalho,
    tipoDocumento: 'DOCUMENTO DE FORMALIZACAO DA DEMANDA (DFD)',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: dfd.gerado_por_ia ?? false,
  }
}
