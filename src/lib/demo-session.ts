'use server'
// Gerencia o estado do Modo Demo via cookies de sessao
// O modo demo e exclusivo do Admin Master e nao afeta dados reais

import { cookies } from 'next/headers'
import type { PapelUsuario } from '@/types/database'

const COOKIE_DEMO_ATIVO = 'licitaia_demo_ativo'
const COOKIE_DEMO_PAPEL = 'licitaia_demo_papel'
const COOKIE_DEMO_ORG   = 'licitaia_demo_org_id'

export interface DemoSession {
  ativo: boolean
  papelSimulado: PapelUsuario | null
  orgDemoId: string | null
}

export async function getDemoSession(): Promise<DemoSession> {
  const cookieStore = await cookies()
  const ativo = cookieStore.get(COOKIE_DEMO_ATIVO)?.value === 'true'
  const papelSimulado = (cookieStore.get(COOKIE_DEMO_PAPEL)?.value ?? null) as PapelUsuario | null
  const orgDemoId = cookieStore.get(COOKIE_DEMO_ORG)?.value ?? null
  return { ativo, papelSimulado, orgDemoId }
}

export async function iniciarModoDemo(orgDemoId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_DEMO_ATIVO, 'true', { path: '/', httpOnly: false, sameSite: 'lax' })
  cookieStore.set(COOKIE_DEMO_ORG, orgDemoId, { path: '/', httpOnly: false, sameSite: 'lax' })
  cookieStore.set(COOKIE_DEMO_PAPEL, 'admin_organizacao', { path: '/', httpOnly: false, sameSite: 'lax' })
}

export async function sairModoDemo(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_DEMO_ATIVO)
  cookieStore.delete(COOKIE_DEMO_PAPEL)
  cookieStore.delete(COOKIE_DEMO_ORG)
}

export async function trocarPapelDemo(novoPapel: PapelUsuario): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_DEMO_PAPEL, novoPapel, { path: '/', httpOnly: false, sameSite: 'lax' })
}
