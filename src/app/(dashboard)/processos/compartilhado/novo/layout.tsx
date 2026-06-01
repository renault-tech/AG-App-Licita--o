import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { PODE_CRIAR_PROCESSO } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

// Trava de rota: apenas perfis em PODE_CRIAR_PROCESSO acessam a entrada compartilhada.
export default async function NovoCompartilhadoLayout({ children }: { children: React.ReactNode }) {
  const papel = await obterPapelUsuario()

  if (!papel || !PODE_CRIAR_PROCESSO.includes(papel as PapelUsuario)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
