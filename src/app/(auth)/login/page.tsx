'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu e-mail antes de entrar.')
      } else {
        toast.error('Credenciais inválidas. Verifique e-mail e senha.')
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
        <CardTitle className="text-xl font-semibold text-gray-800">Acesso ao Sistema</CardTitle>
        <CardDescription>Entre com seu e-mail institucional e senha</CardDescription>
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
          <p className="text-sm text-center text-gray-500">
            Ainda sem acesso?{' '}
            <Link href="/cadastro" className="text-blue-600 hover:underline font-medium">
              Solicite seu cadastro
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
