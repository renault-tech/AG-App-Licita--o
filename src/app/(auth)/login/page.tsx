'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro === 'link_invalido') {
      toast.error('Link de confirmacao invalido ou expirado. Tente fazer login ou solicite novo cadastro.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu e-mail antes de entrar.')
      } else {
        toast.error('Credenciais invalidas. Verifique e-mail e senha.')
      }
      setCarregando(false)
      return
    }

    toast.success('Login efetuado com sucesso!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>Acesso ao Sistema</CardTitle>
        <CardDescription className="text-sm text-[#74777F]">Entre com seu e-mail institucional e senha</CardDescription>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
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
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
            )}
          </Button>
          <p className="text-sm text-center text-[#74777F]">
            Ainda sem acesso?{' '}
            <Link href="/cadastro" className="text-[#1A365D] hover:underline font-semibold">
              Solicite seu cadastro
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
