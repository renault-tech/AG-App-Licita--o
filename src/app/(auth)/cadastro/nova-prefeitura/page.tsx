'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Building2, ChevronLeft, Search, AlertCircle, UserPlus, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, nomePrefeitura, type MunicipioSimplificado } from '@/lib/ibge'
import { cadastrarAdminOrg } from '@/lib/actions/auth-cadastro'

export default function NovaPrefeituraPage() {
  const [passo, setPasso] = useState<1 | 2>(1)
  const [municipio, setMunicipio] = useState<MunicipioSimplificado | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<MunicipioSimplificado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Campos do formulario passo 2
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cargo, setCargo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomePref, setNomePref] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [cnpjJaExiste, setCnpjJaExiste] = useState(false)

  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const resultados = await buscarMunicipios(termoBusca)
      setSugestoes(resultados)
      setMostrarSugestoes(true)
      setBuscando(false)
    }, 350)
  }, [termoBusca])

  function selecionarMunicipio(m: MunicipioSimplificado) {
    setMunicipio(m)
    setNomePref(nomePrefeitura(m))
    setMostrarSugestoes(false)
    setTermoBusca('')
    setCnpjJaExiste(false)
    setPasso(2)
  }

  function formatarCNPJ(v: string) {
    const nums = v.replace(/\D/g, '').slice(0, 14)
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cnpjNums = cnpj.replace(/\D/g, '')
    if (cnpjNums.length !== 14) { toast.error('CNPJ deve ter 14 digitos.'); return }
    if (!municipio) { toast.error('Selecione o municipio.'); return }

    setCarregando(true)
    const resultado = await cadastrarAdminOrg({
      email, senha, nomeCompleto,
      cargo: cargo || undefined,
      nomePrefeitura: nomePref,
      cnpjPrefeitura: cnpjNums,
      municipio: municipio.nome,
      estado: municipio.siglaEstado,
    })

    if (!resultado.success) {
      if (resultado.codigoErro === 'cnpj_existente') {
        setCnpjJaExiste(true)
      } else {
        toast.error(resultado.error ?? 'Erro ao cadastrar.')
      }
      setCarregando(false)
      return
    }

    setConcluido(true)
    setCarregando(false)
  }

  if (concluido) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <Building2 className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Prefeitura registrada!</h2>
          <p className="text-sm text-muted-foreground">
            O cadastro de {nomePref} foi enviado. Confirme seu e-mail e aguarde a ativacao pelo administrador da plataforma.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    )
  }

  if (cnpjJaExiste) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="pt-8 pb-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Prefeitura ja cadastrada</p>
              <p className="text-sm mt-1">
                {nomePref ? `${nomePref} ja` : 'Esta prefeitura ja'} possui cadastro na plataforma. Voce pode entrar com sua conta ou solicitar acesso como usuario.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/login" className="flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent transition-colors">
              <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-semibold">Ja tenho uma conta</div>
                <div className="text-xs text-muted-foreground">Acessar com e-mail e senha</div>
              </div>
            </Link>

            <Link href="/cadastro" className="flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent transition-colors">
              <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-semibold">Solicitar acesso</div>
                <div className="text-xs text-muted-foreground">Criar conta vinculada a esta prefeitura</div>
              </div>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => { setCnpjJaExiste(false); setCnpj('') }}
            className="text-sm text-muted-foreground hover:underline w-full text-center"
          >
            Informei o CNPJ errado, corrigir
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/cadastro" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <CardTitle className="text-xl">Nova Prefeitura</CardTitle>
        </div>
        <CardDescription>
          {passo === 1
            ? 'Busque sua cidade para comecar o cadastro'
            : `Dados de ${municipio?.nome} - ${municipio?.siglaEstado}`}
        </CardDescription>
      </CardHeader>

      {passo === 1 && (
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label>Nome da cidade</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite o nome da sua cidade..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="pl-8"
                autoComplete="off"
              />
              {buscando && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {mostrarSugestoes && sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {sugestoes.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent text-sm text-left"
                    onClick={() => selecionarMunicipio(m)}
                  >
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">{m.estado}</div>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{m.siglaEstado}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {passo === 2 && municipio && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <div className="font-semibold">{nomePref}</div>
              <div className="text-muted-foreground text-xs">{municipio.nome}, {municipio.siglaEstado}</div>
            </div>

            <div className="space-y-2">
              <Label>CNPJ da Prefeitura</Label>
              <Input
                value={cnpj}
                onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seus dados</div>
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Cargo (opcional)</Label>
                <Input
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  placeholder="Ex: Secretario de Administracao"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@prefeitura.gov.br"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha (minimo 8 caracteres)</Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><Building2 className="w-4 h-4 mr-2" /> Registrar prefeitura</>
              }
            </Button>
            <button
              type="button"
              onClick={() => setPasso(1)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Trocar de cidade
            </button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
