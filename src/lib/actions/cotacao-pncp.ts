'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { gerarRelatorio } from '@/lib/cotacao/gerar'
import type {
  ItemEntrada,
  IndiceAtualizacao,
  TipoFontePreco,
  RelatorioCotacao,
} from '@/lib/cotacao/types'

interface ResultadoAcao<T = undefined> {
  success: boolean
  data?: T
  error?: string
}

interface GerarCotacaoInput {
  titulo: string
  indice: IndiceAtualizacao
  fontes: TipoFontePreco[]
  estado?: string
  codigoMunicipio?: number
  processoId?: string | null
  itens: ItemEntrada[]
}

function gerarCodigoValidacao(): string {
  return randomBytes(6).toString('hex').toUpperCase()
}

async function contexto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!usuario?.organizacao_id) return null
  return { supabase, userId: user.id, organizacaoId: usuario.organizacao_id as string }
}

/**
 * Gera a cotacao a partir de consulta real ao PNCP/Compras.gov.br e persiste o
 * resultado. Pode ser independente (processoId null) ou vinculada a um processo.
 */
export async function gerarCotacao(
  input: GerarCotacaoInput,
): Promise<ResultadoAcao<{ cotacaoId: string; relatorio: RelatorioCotacao }>> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida ou organizacao nao encontrada.' }
  const { supabase, userId, organizacaoId } = ctx

  if (!input.itens || input.itens.length === 0) {
    return { success: false, error: 'Informe ao menos um item para cotacao.' }
  }
  if (!input.fontes || input.fontes.length === 0) {
    return { success: false, error: 'Selecione ao menos uma fonte de precos.' }
  }

  // Consulta real e calculo
  const relatorio = await gerarRelatorio(input.itens, {
    fontes: input.fontes,
    indice: input.indice,
    estado: input.estado,
    codigoMunicipio: input.codigoMunicipio,
  })

  const codigoValidacao = gerarCodigoValidacao()

  // Persiste cabecalho da cotacao
  const { data: cotacaoData, error: errCot } = await (supabase.from('cotacoes') as any)
    .insert({
      processo_id: input.processoId ?? null,
      organizacao_id: organizacaoId,
      criado_por: userId,
      fonte: 'pncp',
      titulo: input.titulo,
      indice_atualizacao: input.indice,
      codigo_validacao: codigoValidacao,
      gerado_em: new Date().toISOString(),
      valor_total_geral: relatorio.valorTotalGeral,
      status: 'rascunho',
    })
    .select('id')
    .maybeSingle()

  if (errCot || !cotacaoData) {
    return { success: false, error: `Erro ao salvar cotacao: ${errCot?.message ?? 'desconhecido'}` }
  }
  const cotacaoId = cotacaoData.id as string

  // Persiste itens, fontes e registros
  for (const item of relatorio.itens) {
    const { data: itemData, error: errItem } = await (supabase.from('cotacoes_itens') as any)
      .insert({
        cotacao_id: cotacaoId,
        numero: item.numero,
        titulo: item.titulo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.precoEstCalculado,
        valor_total: item.total,
        precos_utilizados: item.precosUtilizados,
        propostas_encontradas: item.propostasEncontradas,
        preco_estimado: item.precoEstimado,
        percentual: item.percentual,
        preco_est_calculado: item.precoEstCalculado,
        total: item.total,
        mediana_precos: item.mediana,
        media_precos: item.media,
        status_item: item.status,
      })
      .select('id')
      .maybeSingle()

    if (errItem || !itemData) continue
    const itemId = itemData.id as string

    let ordem = 0
    for (const fonte of item.fontes) {
      const { data: fonteData } = await (supabase.from('cotacoes_itens_fontes') as any)
        .insert({
          cotacao_item_id: itemId,
          tipo_fonte: fonte.tipo,
          valor_unitario: fonte.valorUnitario,
          ordem: ordem++,
        })
        .select('id')
        .maybeSingle()

      if (!fonteData) continue
      const fonteId = fonteData.id as string

      const registrosInsert = fonte.registros.map((r) => ({
        fonte_id: fonteId,
        indice: r.indice,
        orgao_cnpj: r.orgaoCnpj,
        orgao_nome: r.orgaoNome,
        unidade_codigo: r.unidadeCodigo,
        unidade_nome: r.unidadeNome,
        identificacao: r.identificacao,
        data_licitacao: r.dataLicitacao,
        valor_original: r.valorOriginal,
        valor_atualizado: r.valorAtualizado,
        fonte_nome: r.fonteNome ?? null,
        url: r.url ?? null,
        descricao_produto: r.descricaoProduto ?? null,
        data_hora_acesso: r.dataHoraAcesso ?? null,
        preco: r.valorOriginal,
        is_outlier: r.isOutlier,
        excluido: false,
      }))
      if (registrosInsert.length > 0) {
        await (supabase.from('cotacoes_fontes_registros') as any).insert(registrosInsert)
      }
    }
  }

  if (input.processoId) {
    // Vinculada a processo: remove a flag de cotacao pendente
    await (supabase.from('processos_licitatorios') as any)
      .update({ cotacao_pendente: false })
      .eq('id', input.processoId)
    revalidatePath(`/processos/${input.processoId}/cotacao`)
  }
  revalidatePath('/cotacao')

  return { success: true, data: { cotacaoId, relatorio } }
}

/**
 * Anexa uma cotacao independente ja gerada a um processo existente,
 * alimentando a etapa de pesquisa de precos do fluxo canonico.
 */
export async function anexarCotacaoAProcesso(
  cotacaoId: string,
  processoId: string,
): Promise<ResultadoAcao> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase } = ctx

  // Garante que o processo nao tenha outra cotacao vinculada
  const { data: existente } = await supabase
    .from('cotacoes')
    .select('id')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (existente) {
    return { success: false, error: 'Este processo ja possui uma cotacao vinculada.' }
  }

  const { error } = await (supabase.from('cotacoes') as any)
    .update({ processo_id: processoId })
    .eq('id', cotacaoId)

  if (error) return { success: false, error: error.message }

  // Remove a flag de cotacao pendente do processo
  await (supabase.from('processos_licitatorios') as any)
    .update({ cotacao_pendente: false })
    .eq('id', processoId)

  revalidatePath(`/processos/${processoId}/cotacao`)
  return { success: true }
}

/** Carrega uma cotacao persistida no formato do relatorio para renderizacao. */
export async function obterCotacaoCompleta(cotacaoId: string): Promise<
  ResultadoAcao<{ cabecalho: any; relatorio: RelatorioCotacao }>
> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase } = ctx

  const { data: cotacao } = await supabase
    .from('cotacoes')
    .select('*')
    .eq('id', cotacaoId)
    .maybeSingle()

  if (!cotacao) return { success: false, error: 'Cotacao nao encontrada.' }

  const { data: itens } = await supabase
    .from('cotacoes_itens')
    .select('*')
    .eq('cotacao_id', cotacaoId)
    .order('numero', { ascending: true })

  const itensRelatorio = []
  for (const item of (itens as any[]) ?? []) {
    const { data: fontes } = await supabase
      .from('cotacoes_itens_fontes')
      .select('*')
      .eq('cotacao_item_id', item.id)
      .order('ordem', { ascending: true })

    const fontesRelatorio = []
    for (const fonte of (fontes as any[]) ?? []) {
      const { data: registros } = await supabase
        .from('cotacoes_fontes_registros')
        .select('*')
        .eq('fonte_id', fonte.id)
        .order('indice', { ascending: true })

      fontesRelatorio.push({
        tipo: fonte.tipo_fonte,
        valorUnitario: Number(fonte.valor_unitario),
        registros: ((registros as any[]) ?? []).map((r) => ({
          indice: r.indice,
          orgaoCnpj: r.orgao_cnpj,
          orgaoNome: r.orgao_nome,
          unidadeCodigo: r.unidade_codigo,
          unidadeNome: r.unidade_nome,
          identificacao: r.identificacao,
          dataLicitacao: r.data_licitacao,
          valorOriginal: Number(r.valor_original),
          valorAtualizado: Number(r.valor_atualizado),
          fonteNome: r.fonte_nome,
          url: r.url,
          descricaoProduto: r.descricao_produto,
          dataHoraAcesso: r.data_hora_acesso,
          isOutlier: r.is_outlier,
        })),
      })
    }

    itensRelatorio.push({
      id: item.id,
      numero: item.numero,
      titulo: item.titulo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: Number(item.quantidade),
      precosUtilizados: item.precos_utilizados,
      propostasEncontradas: item.propostas_encontradas,
      precoEstimado: Number(item.preco_estimado),
      percentual: item.percentual != null ? Number(item.percentual) : null,
      precoEstCalculado: Number(item.preco_est_calculado),
      total: Number(item.total),
      mediana: Number(item.mediana_precos),
      media: Number(item.media_precos),
      status: item.status_item,
      fontes: fontesRelatorio,
      avisos: [],
    })
  }

  return {
    success: true,
    data: {
      cabecalho: cotacao,
      relatorio: {
        indiceAtualizacao: (cotacao as any).indice_atualizacao,
        indiceDisponivel: true,
        itens: itensRelatorio as any,
        valorTotalGeral: Number((cotacao as any).valor_total_geral ?? 0),
      },
    },
  }
}

/**
 * Adiciona um preco de fonte web a um item (Art. 23, inciso III).
 * Guardrail: a URL e validada por requisicao real e a data/hora de acesso e
 * registrada pelo servidor no momento do acesso (nunca fabricada).
 */
export async function adicionarPrecoWeb(
  cotacaoItemId: string,
  input: { url: string; fonteNome: string; descricaoProduto: string; preco: number },
): Promise<ResultadoAcao<{ dataHoraAcesso: string }>> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase, organizacaoId } = ctx

  if (!input.url || !/^https?:\/\//i.test(input.url)) {
    return { success: false, error: 'Informe uma URL valida (http/https).' }
  }
  if (!input.preco || input.preco <= 0) {
    return { success: false, error: 'Informe um preco valido.' }
  }

  // Valida que o dominio consta na lista de fontes confiaveis da organizacao
  let dominio = ''
  try {
    dominio = new URL(input.url).hostname.replace(/^www\./, '')
  } catch {
    return { success: false, error: 'URL malformada.' }
  }

  const { data: confiaveis } = await supabase
    .from('fontes_web_confiaveis')
    .select('dominio')
    .eq('organizacao_id', organizacaoId)
    .eq('ativo', true)

  const listaDominios = ((confiaveis as any[]) ?? []).map((f) => f.dominio.replace(/^www\./, ''))
  if (listaDominios.length > 0 && !listaDominios.some((d) => dominio === d || dominio.endsWith(`.${d}`))) {
    return {
      success: false,
      error: `O dominio ${dominio} nao consta na lista de fontes confiaveis da organizacao.`,
    }
  }

  // Acesso real a URL para confirmar existencia; data/hora registrada pelo servidor
  const dataHoraAcesso = new Date().toISOString()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(input.url, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!resp.ok) {
      return { success: false, error: `A URL retornou status ${resp.status}. Verifique o endereco.` }
    }
  } catch {
    return { success: false, error: 'Nao foi possivel acessar a URL informada.' }
  }

  // Cria/obtem o grupo de fonte web do item
  const { data: fonteExistente } = await supabase
    .from('cotacoes_itens_fontes')
    .select('id')
    .eq('cotacao_item_id', cotacaoItemId)
    .eq('tipo_fonte', 'preco_web')
    .maybeSingle()

  let fonteId = (fonteExistente as any)?.id as string | undefined
  if (!fonteId) {
    const { data: novaFonte, error } = await (supabase.from('cotacoes_itens_fontes') as any)
      .insert({ cotacao_item_id: cotacaoItemId, tipo_fonte: 'preco_web', valor_unitario: input.preco, ordem: 99 })
      .select('id')
      .maybeSingle()
    if (error || !novaFonte) return { success: false, error: 'Erro ao registrar fonte web.' }
    fonteId = novaFonte.id
  }
  if (!fonteId) return { success: false, error: 'Erro ao registrar fonte web.' }

  const { count } = await supabase
    .from('cotacoes_fontes_registros')
    .select('id', { count: 'exact', head: true })
    .eq('fonte_id', fonteId)

  const { error: errReg } = await (supabase.from('cotacoes_fontes_registros') as any).insert({
    fonte_id: fonteId,
    indice: (count ?? 0) + 1,
    identificacao: input.fonteNome,
    fonte_nome: input.fonteNome,
    url: input.url,
    descricao_produto: input.descricaoProduto,
    data_hora_acesso: dataHoraAcesso,
    valor_original: input.preco,
    valor_atualizado: input.preco, // preco web e atual, sem correcao por indice
    preco: input.preco,
    is_outlier: false,
    excluido: false,
  })

  if (errReg) return { success: false, error: errReg.message }
  return { success: true, data: { dataHoraAcesso } }
}

/** Lista processos da organizacao que ainda nao possuem cotacao vinculada. */
export async function listarProcessosSemCotacao(): Promise<ResultadoAcao<any[]>> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase, organizacaoId } = ctx

  const { data: processos } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, numero_processo, fase_atual')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: comCotacao } = await supabase
    .from('cotacoes')
    .select('processo_id')
    .eq('organizacao_id', organizacaoId)
    .not('processo_id', 'is', null)

  const vinculados = new Set(((comCotacao as any) ?? []).map((c: any) => c.processo_id))
  const disponiveis = ((processos as any[]) ?? []).filter((p) => !vinculados.has(p.id))

  return { success: true, data: disponiveis }
}

// ------------------------------------------------------------
// Fontes web confiaveis (Art. 23, inciso III)
// ------------------------------------------------------------

export async function listarFontesWeb(): Promise<ResultadoAcao<any[]>> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase, organizacaoId } = ctx
  const { data } = await supabase
    .from('fontes_web_confiaveis')
    .select('*')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })
  return { success: true, data: (data as any[]) ?? [] }
}

export async function adicionarFonteWeb(
  nome: string,
  dominio: string,
): Promise<ResultadoAcao> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase, organizacaoId } = ctx

  const nomeLimpo = nome.trim()
  let dominioLimpo = dominio.trim().toLowerCase()
  // Aceita URL completa ou dominio puro
  try {
    if (/^https?:\/\//i.test(dominioLimpo)) dominioLimpo = new URL(dominioLimpo).hostname
  } catch {
    return { success: false, error: 'Dominio invalido.' }
  }
  dominioLimpo = dominioLimpo.replace(/^www\./, '')
  if (!nomeLimpo || !dominioLimpo) {
    return { success: false, error: 'Informe nome e dominio.' }
  }

  const { error } = await (supabase.from('fontes_web_confiaveis') as any).insert({
    organizacao_id: organizacaoId,
    nome: nomeLimpo,
    dominio: dominioLimpo,
    ativo: true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/cotacao/fontes')
  return { success: true }
}

export async function alternarFonteWeb(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase } = ctx
  const { error } = await (supabase.from('fontes_web_confiaveis') as any)
    .update({ ativo })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/cotacao/fontes')
  return { success: true }
}

export async function removerFonteWeb(id: string): Promise<ResultadoAcao> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase } = ctx
  const { error } = await supabase.from('fontes_web_confiaveis').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/cotacao/fontes')
  return { success: true }
}

/** Lista cotacoes independentes da organizacao (para anexar/visualizar). */
export async function listarCotacoes(): Promise<ResultadoAcao<any[]>> {
  const ctx = await contexto()
  if (!ctx) return { success: false, error: 'Sessao invalida.' }
  const { supabase, organizacaoId } = ctx

  const { data } = await supabase
    .from('cotacoes')
    .select('id, titulo, processo_id, valor_total_geral, gerado_em, status, codigo_validacao')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { success: true, data: (data as any[]) ?? [] }
}
