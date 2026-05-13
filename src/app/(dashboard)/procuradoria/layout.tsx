import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'

export default async function ProcuradoriaLayout({ children }: { children: React.ReactNode }) {
  const papel = await obterPapelUsuario()
  const permitidos = ['procurador', 'admin_organizacao', 'admin_plataforma']
  if (!papel || !permitidos.includes(papel)) redirect('/dashboard')
  return <>{children}</>
}
