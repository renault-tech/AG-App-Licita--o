'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function CadastroPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })

    if (error) {
      toast.error(error.message)
      setCarregando(false)
      return
    }

    toast.success('Conta criada! Verifique seu e-mail.')
    setEnviado(true)
    setCarregando(false)
  }

  if (enviado) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <div className="text-4xl">📧</div>
          <h2 className="text-lg font-semibold text-gray-800">Confirme seu e-mail</h2>
          <p className="text-sm text-gray-500">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Acesse sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-md text-left">
            <strong>Dica para ambiente local:</strong> Acesse a caixa de entrada simulada do Supabase em <a href="http://localhost:54324" target="_blank" className="underline font-bold">http://localhost:54324</a> para ver o e-mail de confirmação e clicar no link.
          </div>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold text-gray-800">Criar Conta</CardTitle>
        <CardDescription>Cadastre-se para acessar a plataforma</CardDescription>
      </CardHeader>

      <form onSubmit={handleCadastro}>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha (mínimo 8 caracteres)</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" /> Criar conta</>
            )}
          </Button>
          <p className="text-sm text-center text-gray-500">
            Já tem acesso?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
