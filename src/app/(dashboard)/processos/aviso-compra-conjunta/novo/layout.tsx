import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { PODE_CRIAR_PROCESSO } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

export default async function NovoAvisoLayout({ children }: { children: React.ReactNode }) {
  const papel = await obterPapelUsuario()

  if (!papel || !PODE_CRIAR_PROCESSO.includes(papel as PapelUsuario)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
