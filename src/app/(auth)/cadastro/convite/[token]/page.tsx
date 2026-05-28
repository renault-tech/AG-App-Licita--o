import { validarConvite } from '@/lib/actions/convites'
import FormCadastroConvidado from './form-cadastro-convidado'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ConvitePage({ params }: Props) {
  const { token } = await params
  const resultado = await validarConvite(token)

  if (!resultado.valido || !resultado.convite) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold">Link invalido</h2>
          <p className="text-sm text-muted-foreground">{resultado.error}</p>
          <Link href="/login" className="text-sm font-semibold hover:underline">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  const c = resultado.convite

  return (
    <FormCadastroConvidado
      token={token}
      emailDestino={c.email_destino}
      nomePrefeitura={c.nome_prefeitura ?? undefined}
      municipio={c.municipio ?? undefined}
      estado={c.estado ?? undefined}
    />
  )
}
