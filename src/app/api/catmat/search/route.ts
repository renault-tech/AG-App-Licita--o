// src/app/api/catmat/search/route.ts
// Proxy server-side para o catalogo CATMAT/CATSER federal
// Evita CORS e centraliza o cache Next.js no servidor

import { NextRequest, NextResponse } from 'next/server'
import { buscarItens } from '@/lib/catmat/catmat-client'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const termo = req.nextUrl.searchParams.get('q') ?? ''
  if (termo.trim().length < 3) {
    return NextResponse.json({ itens: [] })
  }

  const itens = await buscarItens(termo)
  return NextResponse.json({ itens })
}
