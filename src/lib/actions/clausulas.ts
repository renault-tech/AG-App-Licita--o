'use server'

import { createClient } from '@/lib/supabase/server'

export async function buscarClausulaParaCampo(
  documento: 'dfd' | 'etp' | 'tr',
  tipoCampo: string,
  modalidade: string,
  categoriaObjeto: string,
  organizacaoId: string
): Promise<{ texto: string; origem: 'aprendida' | 'template' | 'vazio'; processosReferencia: string[] }> {
  const supabase = await createClient()

  const candidatos = [
    { modalidade, categoria_objeto: categoriaObjeto },
    { modalidade: null as null, categoria_objeto: categoriaObjeto },
    { modalidade, categoria_objeto: null as null },
    { modalidade: null as null, categoria_objeto: null as null },
  ]

  for (const filtro of candidatos) {
    let query = (supabase as any)
      .from('clausulas_aprendidas')
      .select('texto_aprovado, processos_referencia')
      .eq('organizacao_id', organizacaoId)
      .eq('documento', documento)
      .eq('tipo_campo', tipoCampo)
      .order('uso_count', { ascending: false })
      .limit(1)

    if (filtro.modalidade) query = query.eq('modalidade', filtro.modalidade)
    else query = query.is('modalidade', null)
    if (filtro.categoria_objeto) query = query.eq('categoria_objeto', filtro.categoria_objeto)
    else query = query.is('categoria_objeto', null)

    const { data } = await query.maybeSingle()
    if (data) {
      return { texto: data.texto_aprovado, origem: 'aprendida', processosReferencia: data.processos_referencia ?? [] }
    }
  }

  for (const filtro of candidatos) {
    let query = (supabase as any)
      .from('clausulas_padrao')
      .select('texto_template')
      .eq('documento', documento)
      .eq('tipo_campo', tipoCampo)
      .eq('ativo', true)
      .limit(1)

    if (filtro.modalidade) query = query.eq('modalidade', filtro.modalidade)
    else query = query.is('modalidade', null)
    if (filtro.categoria_objeto) query = query.eq('categoria_objeto', filtro.categoria_objeto)
    else query = query.is('categoria_objeto', null)

    const { data } = await query.maybeSingle()
    if (data) {
      return { texto: data.texto_template, origem: 'template', processosReferencia: [] }
    }
  }

  return { texto: '', origem: 'vazio', processosReferencia: [] }
}

export async function registrarAprendizado(params: {
  organizacaoId: string
  processoId: string
  documento: 'dfd' | 'etp' | 'tr'
  tipoCampo: string
  modalidade: string
  categoriaObjeto: string
  textoOriginal: string
  textoAprovado: string
}): Promise<void> {
  const supabase = await createClient()

  const { data: existente } = await (supabase as any)
    .from('clausulas_aprendidas')
    .select('id, processos_referencia, uso_count')
    .eq('organizacao_id', params.organizacaoId)
    .eq('documento', params.documento)
    .eq('tipo_campo', params.tipoCampo)
    .eq('modalidade', params.modalidade)
    .eq('categoria_objeto', params.categoriaObjeto)
    .maybeSingle()

  if (existente) {
    const refs = [...new Set([...(existente.processos_referencia ?? []), params.processoId])]
    await (supabase as any)
      .from('clausulas_aprendidas')
      .update({
        texto_aprovado: params.textoAprovado,
        processos_referencia: refs,
        uso_count: existente.uso_count + 1,
        ultima_vez_em: new Date().toISOString(),
      })
      .eq('id', existente.id)
  } else {
    await (supabase as any)
      .from('clausulas_aprendidas')
      .insert({
        organizacao_id: params.organizacaoId,
        documento: params.documento,
        tipo_campo: params.tipoCampo,
        modalidade: params.modalidade,
        categoria_objeto: params.categoriaObjeto,
        texto_original: params.textoOriginal,
        texto_aprovado: params.textoAprovado,
        processos_referencia: [params.processoId],
      })
  }
}

export async function buscarProcessosReferencia(ids: string[]) {
  if (!ids.length) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade')
    .in('id', ids)
  return (data ?? []) as Array<{ id: string; numero_processo: string | null; objeto: string; modalidade: string }>
}

export async function seedClausulasPadrao(): Promise<void> {
  const supabase = await createClient()
  const { count } = await (supabase as any)
    .from('clausulas_padrao')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) return

  const { CLAUSULAS_INICIAIS } = await import('@/data/clausulas-iniciais')
  await (supabase as any).from('clausulas_padrao').insert(
    CLAUSULAS_INICIAIS.map(c => ({
      tipo_campo: c.tipo_campo,
      documento: c.documento,
      modalidade: c.modalidade,
      categoria_objeto: c.categoria_objeto,
      texto_template: c.texto_template,
      variaveis: c.variaveis,
    }))
  )
}
