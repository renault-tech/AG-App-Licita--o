'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn, Search, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, type MunicipioSimplificado } from '@/lib/ibge'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false)
  const [reenvioOk, setReenvioOk] = useState(false)
  const [termoPrefeitura, setTermoPrefeitura] = useState('')
  const [municipios, setMunicipios] = useState<MunicipioSimplificado[]>([])
  const [municipioSelecionado, setMunicipioSelecionado] = useState<MunicipioSimplificado | null>(null)
  const [buscandoPrefeitura, setBuscandoPrefeitura] = useState(false)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro === 'link_invalido') {
      toast.error('Link de confirmacao invalido ou expirado.')
    }
  }, [searchParams])

  useEffect(() => {
    if (termoPrefeitura.length < 2) {
      setMunicipios([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscandoPrefeitura(true)
      const resultados = await buscarMunicipios(termoPrefeitura)
      setMunicipios(resultados)
      setMostrarSugestoes(true)
      setBuscandoPrefeitura(false)
    }, 350)
  }, [termoPrefeitura])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
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
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">
          Acesso ao Sistema
        </CardTitle>
        <CardDescription>Entre com seu e-mail institucional e senha</CardDescription>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="prefeitura">Prefeitura (opcional)</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="prefeitura"
                type="text"
                placeholder="Digite o nome da cidade..."
                value={municipioSelecionado ? `${municipioSelecionado.nome} - ${municipioSelecionado.siglaEstado}` : termoPrefeitura}
                onChange={e => {
                  setMunicipioSelecionado(null)
                  setTermoPrefeitura(e.target.value)
                }}
                onFocus={() => setMostrarSugestoes(municipios.length > 0)}
                className="pl-8"
                autoComplete="off"
              />
              {buscandoPrefeitura && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {mostrarSugestoes && municipios.length > 0 && !municipioSelecionado && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {municipios.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm text-left"
                    onClick={() => {
                      setMunicipioSelecionado(m)
                      setMostrarSugestoes(false)
                      setTermoPrefeitura('')
                    }}
                  >
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{m.nome}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{m.siglaEstado}</span>
                  </button>
                ))}
              </div>
            )}
            {municipioSelecionado && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Building2 className="w-3 h-3" />
                <span>Prefeitura Municipal de {municipioSelecionado.nome}, {municipioSelecionado.estado}</span>
              </div>
            )}
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
          <p className="text-sm text-center text-muted-foreground">
            Ainda sem acesso?{' '}
            <Link href="/cadastro" className="font-semibold hover:underline">
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
