'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn, Building2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthBranding } from '@/lib/auth/branding-context'

interface Org { id: string; nome: string }

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { setBrandingByOrgId } = useAuthBranding()

  const [orgs,       setOrgs]       = useState<Org[]>([])
  const [orgId,      setOrgId]      = useState('')
  const [email,      setEmail]      = useState('')
  const [senha,      setSenha]      = useState('')
  const [carregando, setCarregando] = useState(false)
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false)
  const [reenvioOk,  setReenvioOk]  = useState(false)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro === 'link_invalido') toast.error('Link de confirmacao invalido ou expirado.')
  }, [searchParams])

  useEffect(() => {
    async function carregarOrgs() {
      const supabase = createClient()
      const { data } = await supabase
        .from('organizacoes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      setOrgs((data ?? []) as Org[])
    }
    carregarOrgs()
  }, [])

  async function handleOrgSelect(id: string) {
    setOrgId(id)
    await setBrandingByOrgId(id)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) { toast.error('Selecione sua prefeitura.'); return }
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setEmailNaoConfirmado(true)
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
    <div className="space-y-4">
      <Card className="shadow-lg border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Acesso ao Sistema</CardTitle>
          <CardDescription>Entre com e-mail e senha da sua conta institucional</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prefeitura</Label>
              <Select onValueChange={handleOrgSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua prefeitura..." />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {o.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              {carregando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
              }
            </Button>

            {emailNaoConfirmado && (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 space-y-2">
                <p>E-mail ainda nao confirmado. Verifique sua caixa de entrada.</p>
                {reenvioOk ? (
                  <p className="text-green-700 font-medium">Link reenviado com sucesso.</p>
                ) : (
                  <button
                    type="button"
                    className="font-semibold underline hover:no-underline"
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.resend({ type: 'signup', email })
                      setReenvioOk(true)
                    }}
                  >
                    Reenviar e-mail de confirmacao
                  </button>
                )}
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground">
              <Link href="/recuperar-senha" className="hover:underline">
                Esqueci minha senha
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Dois caminhos de cadastro */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cadastro"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-gray-50 transition-colors text-center shadow-sm"
        >
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Solicitar acesso</div>
            <div className="text-xs text-muted-foreground">Minha prefeitura ja esta cadastrada</div>
          </div>
        </Link>

        <Link
          href="/cadastro/nova-prefeitura"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-gray-50 transition-colors text-center shadow-sm"
        >
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Cadastrar prefeitura</div>
            <div className="text-xs text-muted-foreground">Sou o administrador da prefeitura</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
