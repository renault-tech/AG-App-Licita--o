import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) return NextResponse.json([])

  const qSafe = q.replace(/[%_;\\]/g, '')
  const papel = (usuarioData as any).papel
  const orgId = (usuarioData as any).organizacao_id

  let query = (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade, status')
    .limit(8)

  if (papel === 'requisitante') {
    query = query.eq('criado_por', user.id)
  } else {
    query = query.eq('organizacao_id', orgId)
  }

  const { data } = await query
    .or(`numero_processo.ilike.%${qSafe}%,objeto.ilike.%${qSafe}%`)

  return NextResponse.json(data ?? [])
}
