import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { lerPreferenciasTicker } from '@/lib/actions/ticker'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import FaixaForm from './faixa-form'

export default async function FaixaDeInformacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const categorias = await lerPreferenciasTicker()

  return (
    <div>
      <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <EditorialKicker kicker="Configurações" tone="muted" />
        <HeadlineSerif size="sm" as="h2" style={{ marginTop: 8 }}>
          Faixa de Informações
        </HeadlineSerif>
        <p className="mt-2 text-sm" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)' }}>
          Escolha quais categorias de eventos aparecem na faixa Ao Vivo no topo da plataforma.
        </p>
      </div>

      <FaixaForm categorias={categorias} />
    </div>
  )
}
