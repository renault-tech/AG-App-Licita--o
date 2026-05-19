import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarOrgDemo } from '@/lib/actions/admin-master'
import { iniciarModoDemo } from '@/lib/demo-session'

async function entrarModoDemo() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || (usuario as any).papel !== 'admin_plataforma') redirect('/dashboard')

  const orgDemo = await buscarOrgDemo()
  if (!orgDemo) {
    redirect('/admin/painel-master?erro=org-demo-nao-encontrada')
  }

  await iniciarModoDemo(orgDemo.id)
  redirect('/dashboard')
}

export default async function ModoDemoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || (usuario as any).papel !== 'admin_plataforma') redirect('/dashboard')

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl"
        style={{ background: '#FFF7ED', border: '2px solid #FED7AA' }}
      >
        🎭
      </div>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
          Modo Demo
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
          Voce vai entrar em uma prefeitura ficticia isolada.
          Nenhuma alteracao feita no modo demo afeta prefeituras reais.
          Voce pode simular os 8 perfis da plataforma para fins de demonstracao comercial.
        </p>
      </div>

      <div
        className="rounded-xl p-4 text-sm text-left space-y-2"
        style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E' }}
      >
        <div className="font-semibold">No modo demo voce pode:</div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Simular qualquer um dos 8 perfis</li>
          <li>Criar processos e documentos de demonstracao</li>
          <li>Usar todas as funcionalidades da IA</li>
          <li>Mostrar o fluxo completo para potenciais clientes</li>
        </ul>
      </div>

      <form action={entrarModoDemo}>
        <button
          type="submit"
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#EA580C' }}
        >
          Entrar no Modo Demo
        </button>
      </form>
    </div>
  )
}
