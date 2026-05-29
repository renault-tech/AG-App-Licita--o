'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CanalChat, CanalComNaoLidos, MensagemChat, UsuarioChat } from '@/types/chat'

export async function buscarCanaisComNaoLidos(): Promise<CanalComNaoLidos[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return []
  const orgId = (usr as any).organizacao_id

  const { data: canais } = await (supabase as any)
    .from('canais_chat')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('tipo', { ascending: true })
    .order('nome', { ascending: true })

  if (!canais?.length) return []

  // Deduplica: para tipo 'plataforma', mantém apenas o primeiro por org (evita duplicatas de insert concorrente)
  const vistosPorTipoRef = new Set<string>()
  const canaisUnicos = (canais as CanalChat[]).filter(c => {
    const chave = c.tipo === 'plataforma'
      ? `plataforma:${c.organizacao_id}`
      : `${c.tipo}:${c.referencia_id ?? c.id}`
    if (vistosPorTipoRef.has(chave)) return false
    vistosPorTipoRef.add(chave)
    return true
  })

  const { data: leituras } = await (supabase as any)
    .from('leituras_chat')
    .select('canal_id, ultima_leitura')
    .eq('usuario_id', user.id)
    .in('canal_id', canaisUnicos.map(c => c.id))

  const leiturasMap: Record<string, string> = {}
  for (const l of (leituras ?? []) as any[]) {
    leiturasMap[l.canal_id] = l.ultima_leitura
  }

  const resultado: CanalComNaoLidos[] = []
  for (const canal of canaisUnicos) {
    const ultimaLeitura = leiturasMap[canal.id]
    const query = (supabase as any)
      .from('mensagens_chat')
      .select('*', { count: 'exact', head: true })
      .eq('canal_id', canal.id)
      .neq('autor_id', user.id)

    const { count } = ultimaLeitura
      ? await query.gt('criado_em', ultimaLeitura)
      : await query

    resultado.push({ ...canal, nao_lidos: count ?? 0 })
  }

  return resultado
}

export async function buscarMensagens(canalId: string): Promise<MensagemChat[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('mensagens_chat')
    .select(`
      *,
      autor:usuarios(nome_completo, papel)
    `)
    .eq('canal_id', canalId)
    .order('criado_em', { ascending: true })
    .limit(100)

  return (data ?? []) as MensagemChat[]
}

export async function enviarMensagem(
  canalId: string,
  conteudo: string,
  respondendoA?: string,
): Promise<{ success: boolean; error?: string }> {
  const texto = conteudo.trim()
  if (!texto || texto.length > 4000) {
    return { success: false, error: 'Mensagem invalida' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const { error } = await (supabase as any)
    .from('mensagens_chat')
    .insert({
      canal_id: canalId,
      autor_id: user.id,
      conteudo: texto,
      respondendo_a: respondendoA ?? null,
    })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/chat/${canalId}`)
  return { success: true }
}

export async function marcarCanalComoLido(canalId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('leituras_chat')
    .upsert({
      usuario_id: user.id,
      canal_id: canalId,
      ultima_leitura: new Date().toISOString(),
    })
}

export async function garantirCanalProcesso(
  processoId: string,
  nomeProcesso: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existente } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'processo')
    .eq('referencia_id', processoId)
    .maybeSingle()

  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'processo', referencia_id: processoId, nome: nomeProcesso })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

export async function garantirCanalPlataforma(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existentes } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'plataforma')
    .eq('organizacao_id', orgId)
    .limit(1)

  const existente = existentes?.[0] ?? null
  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'plataforma', referencia_id: null, nome: 'Geral' })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

export async function garantirCanalSetor(
  secretariaId: string,
  nomeSetor: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existente } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'setor')
    .eq('referencia_id', secretariaId)
    .maybeSingle()

  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'setor', referencia_id: secretariaId, nome: nomeSetor })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

export async function listarUsuariosOrg(): Promise<UsuarioChat[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return []
  const orgId = (usr as any).organizacao_id

  const { data } = await (supabase as any)
    .from('usuarios')
    .select('id, nome_completo, papel, secretaria_id')
    .eq('organizacao_id', orgId)
    .neq('id', user.id)
    .order('nome_completo', { ascending: true })
    .limit(100)

  return (data ?? []) as UsuarioChat[]
}

// Cria ou recupera um canal DM entre o usuario atual e outro usuario
export async function garantirCanalDM(outroUsuarioId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  // Busca canal DM existente entre os dois usuarios
  const { data: participacoes } = await (supabase as any)
    .from('canais_dm_participantes')
    .select('canal_id')
    .eq('usuario_id', user.id)

  if (participacoes?.length) {
    const meusCanalIds = (participacoes as any[]).map((p: any) => p.canal_id)
    const { data: candidatos } = await (supabase as any)
      .from('canais_dm_participantes')
      .select('canal_id')
      .eq('usuario_id', outroUsuarioId)
      .in('canal_id', meusCanalIds)

    if (candidatos?.length) {
      return (candidatos[0] as any).canal_id
    }
  }

  // Busca nome do outro usuario para nomear o canal
  const { data: outro } = await (supabase as any)
    .from('usuarios')
    .select('nome_completo')
    .eq('id', outroUsuarioId)
    .maybeSingle()
  const nomeOutro = (outro as any)?.nome_completo ?? 'Usuario'

  // Cria novo canal DM
  const { data: novoCanal, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'dm', referencia_id: null, nome: nomeOutro })
    .select('id')
    .single()

  if (error || !novoCanal) return null

  const canalId = (novoCanal as any).id

  // Insere os dois participantes
  await (supabase as any)
    .from('canais_dm_participantes')
    .insert([
      { canal_id: canalId, usuario_id: user.id },
      { canal_id: canalId, usuario_id: outroUsuarioId },
    ])

  return canalId
}

export async function contarNaoLidosTotal(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return 0
  const orgId = (usr as any).organizacao_id

  const { data: canais } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('organizacao_id', orgId)

  if (!canais?.length) return 0
  const ids = (canais as any[]).map(c => c.id)

  const { data: leituras } = await (supabase as any)
    .from('leituras_chat')
    .select('canal_id, ultima_leitura')
    .eq('usuario_id', user.id)
    .in('canal_id', ids)

  const leiturasMap: Record<string, string> = {}
  for (const l of (leituras ?? []) as any[]) {
    leiturasMap[l.canal_id] = l.ultima_leitura
  }

  let total = 0
  for (const canalId of ids) {
    const ultimaLeitura = leiturasMap[canalId]
    const q = (supabase as any)
      .from('mensagens_chat')
      .select('*', { count: 'exact', head: true })
      .eq('canal_id', canalId)
      .neq('autor_id', user.id)

    const { count } = ultimaLeitura ? await q.gt('criado_em', ultimaLeitura) : await q
    total += count ?? 0
  }

  return total
}
