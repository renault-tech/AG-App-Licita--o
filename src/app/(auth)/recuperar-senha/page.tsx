'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    if (error) {
      toast.error('Nao foi possivel enviar o e-mail. Verifique o endereco e tente novamente.')
    } else {
      setEnviado(true)
    }
    setEnviando(false)
  }

  if (enviado) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">E-mail enviado</CardTitle>
          <CardDescription>
            Verifique sua caixa de entrada. O link de redefinicao expira em 1 hora.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu e-mail institucional e enviaremos um link de redefinicao.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail institucional</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.gov.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              : <><Mail className="w-4 h-4 mr-2" /> Enviar link de recuperacao</>
            }
          </Button>
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full" type="button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
