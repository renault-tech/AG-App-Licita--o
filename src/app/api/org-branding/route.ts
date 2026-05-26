import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Fallback: cor primaria dos temas predefinidos (quando cor_primaria ainda nao esta definida)
const TEMA_COR: Record<string, string> = {
  petroleo:   '#1F3B4E',
  grafite:    '#111111',
  brasao:     '#1A4828',
  noite:      '#0D1117',
  cataguases: '#0E1B33',
}

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const [{ data: org }, { data: secretarias }] = await Promise.all([
    supabase
      .from('organizacoes')
      .select('nome, brasao_url, cor_primaria, tema_padrao')
      .eq('id', orgId)
      .eq('ativo', true)
      .maybeSingle(),
    supabase
      .from('secretarias')
      .select('id, nome')
      .eq('organizacao_id', orgId)
      .order('nome'),
  ])

  if (!org) {
    return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
  }

  const cor_primaria =
    (org as Record<string, unknown>).cor_primaria as string | null ??
    TEMA_COR[(org as Record<string, unknown>).tema_padrao as string] ??
    '#112239'

  return NextResponse.json(
    {
      nome:        (org as Record<string, unknown>).nome as string,
      brasao_url:  (org as Record<string, unknown>).brasao_url as string | null,
      cor_primaria,
      secretarias: (secretarias ?? []) as { id: string; nome: string }[],
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  )
}
