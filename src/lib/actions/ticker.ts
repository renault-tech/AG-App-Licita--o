'use server'

import { createClient } from '@/lib/supabase/server'
import type { TickerCategoriaId, TickerEvento } from '@/lib/ticker/categorias'
import { TICKER_CATEGORIAS_DEFAULT } from '@/lib/ticker/categorias'

export async function buscarEventosTicker(): Promise<TickerEvento[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usr } = await supabase
    .from('usuarios').select('organizacao_id').eq('id', user.id).single()
  if (!usr) return []

  const eventos: TickerEvento[] = []
  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const orgId = (usr as any).organizacao_id

  // 1) Processos atualizados recentemente (movimentacao + etapa)
  const { data: procs } = await supabase
    .from('processos_licitatorios')
    .select('numero_processo, objeto, status, etapa_atual, updated_at')
    .eq('organizacao_id', orgId)
    .gte('updated_at', desde)
    .order('updated_at', { ascending: false })
    .limit(20)

  for (const p of (procs ?? []) as any[]) {
    const num = p.numero_processo ?? '—'
    const obj = String(p.objeto ?? '').slice(0, 60)
    if (p.status === 'publicado') {
      eventos.push({ categoria: 'etapa', num, txt: `Publicado · ${obj}`, tone: 'success', ts: formatTs(p.updated_at) })
    } else if (p.status === 'assinado') {
      eventos.push({ categoria: 'assinatura', num, txt: `Assinado · ${obj}`, tone: 'success', ts: formatTs(p.updated_at) })
    } else {
      const etapaLabel = ETAPA_LABELS[p.etapa_atual as number] ?? `Etapa ${p.etapa_atual}`
      eventos.push({ categoria: 'movimentacao', num, txt: `${etapaLabel} · ${obj}`, tone: 'accent', ts: formatTs(p.updated_at) })
    }
  }

  // 2) Pareceres recentes
  const { data: par } = await (supabase as any)
    .from('pareceres')
    .select('resultado, created_at, processos_licitatorios(numero_processo)')
    .eq('organizacao_id', orgId)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(15)

  for (const p of (par ?? []) as any[]) {
    const num = p.processos_licitatorios?.numero_processo ?? 'PGM'
    eventos.push({
      categoria: 'parecer',
      num,
      txt: p.resultado === 'aprovado' ? 'Parecer aprovado'
        : p.resultado === 'aprovado_com_ressalvas' ? 'Aprovado c/ ressalvas'
        : p.resultado === 'devolvido' ? 'Devolvido pela Procuradoria'
        : 'Parecer emitido',
      tone: p.resultado === 'aprovado' ? 'success'
        : p.resultado === 'devolvido' ? 'danger'
        : 'warn',
      ts: formatTs(p.created_at),
    })
  }

  // 3) Assinaturas recentes
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('provedor, created_at')
    .eq('organizacao_id', orgId)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(15)

  for (const a of (ass ?? []) as any[]) {
    eventos.push({
      categoria: 'assinatura',
      num: a.provedor === 'icp-brasil' ? 'ICP-Brasil' : a.provedor === 'govbr' ? 'Gov.br' : (a.provedor ?? 'Digital'),
      txt: 'Documento assinado eletronicamente',
      tone: 'accent',
      ts: formatTs(a.created_at),
    })
  }

  // 4) Publicacoes recentes
  const { data: pub } = await (supabase as any)
    .from('publicacoes')
    .select('pncp_numero, diario_oficial, portal_proprio, data_publicacao, processos_licitatorios(numero_processo, objeto)')
    .eq('organizacao_id', orgId)
    .gte('data_publicacao', desde.slice(0, 10))
    .order('data_publicacao', { ascending: false })
    .limit(15)

  for (const p of (pub ?? []) as any[]) {
    const proc = p.processos_licitatorios
    const canal = p.pncp_numero ? 'PNCP' : p.diario_oficial ? 'DOE' : p.portal_proprio ? 'Portal' : 'Publicado'
    eventos.push({
      categoria: 'publicacao',
      num: canal,
      txt: `${proc?.numero_processo ?? '—'} · ${String(proc?.objeto ?? '').slice(0, 50)}`,
      tone: 'success',
      ts: p.data_publicacao ? new Date(p.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '·') : 'hoje',
    })
  }

  return eventos.length > 0 ? eventos.slice(0, 30) : eventosFallback()
}

export async function lerPreferenciasTicker(): Promise<Record<TickerCategoriaId, boolean>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return TICKER_CATEGORIAS_DEFAULT
  const { data } = await supabase
    .from('ticker_preferencias')
    .select('categorias')
    .eq('usuario_id', user.id)
    .maybeSingle()
  return (data as any)?.categorias ?? TICKER_CATEGORIAS_DEFAULT
}

export async function salvarPreferenciasTicker(
  categorias: Record<TickerCategoriaId, boolean>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }
  const { error } = await supabase
    .from('ticker_preferencias')
    .upsert({ usuario_id: user.id, categorias, atualizado_em: new Date().toISOString() })
  return error ? { success: false, error: error.message } : { success: true }
}

const ETAPA_LABELS: Record<number, string> = {
  1: 'DFD', 2: 'Cotação', 3: 'ETP', 4: 'TR', 5: 'Riscos',
  6: 'Edital', 7: 'Declaração', 8: 'Ofício', 9: 'Parecer',
  10: 'Autorização', 11: 'Publicação',
}

function formatTs(iso: string | Date): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  }
  const ontem = new Date(now)
  ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '·')
}

function eventosFallback(): TickerEvento[] {
  return [
    { categoria: 'ia',        num: 'IA',   txt: 'Aprimoramentos disponíveis para todos os documentos',     tone: 'accent',  ts: 'agora' },
    { categoria: 'publicacao',num: 'PNCP', txt: 'Conectado ao Painel Nacional de Contratações Públicas',   tone: 'neutral', ts: 'agora' },
    { categoria: 'parecer',   num: 'PGM',  txt: 'Art. 53, Parecer jurídico obrigatório antes da abertura', tone: 'accent',  ts: 'agora' },
  ]
}
