'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function NovaSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [tokenValido, setTokenValido] = useState(true)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro) {
      setTokenValido(false)
      toast.error('Link invalido ou expirado. Solicite um novo.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      toast.error('As senhas nao coincidem.')
      return
    }
    setSalvando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      toast.error('Nao foi possivel redefinir a senha. Solicite um novo link.')
    } else {
      toast.success('Senha redefinida com sucesso.')
      router.push('/login')
    }
    setSalvando(false)
  }

  if (!tokenValido) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Link invalido</CardTitle>
          <CardDescription>
            Este link de redefinicao nao e mais valido. Solicite um novo.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/recuperar-senha" className="w-full">
            <Button className="w-full">Solicitar novo link</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Nova senha</CardTitle>
        <CardDescription>
          Escolha uma senha com pelo menos 8 caracteres.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Confirmar senha</Label>
            <Input
              id="confirmacao"
              type="password"
              placeholder="••••••••"
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={salvando}>
            {salvando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              : <><KeyRound className="w-4 h-4 mr-2" /> Redefinir senha</>
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

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={null}>
      <NovaSenhaForm />
    </Suspense>
  )
}
