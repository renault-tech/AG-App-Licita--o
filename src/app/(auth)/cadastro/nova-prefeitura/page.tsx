'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2, Building2, ChevronLeft, Search,
  AlertCircle, UserPlus, LogIn, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, nomePrefeitura, type MunicipioSimplificado } from '@/lib/ibge'
import { cadastrarAdminOrg } from '@/lib/actions/auth-cadastro'
import { uploadOrgLogoRegistro } from '@/lib/actions/storage'
import { HexColorPickerField } from '@/components/licita/hex-color-picker-field'
import { LogoFilePicker } from '@/components/licita/logo-file-picker'

const SECRETARIAS_PADRAO = [
  'Gabinete do Prefeito',
  'Secretaria de Administracao',
  'Secretaria de Financas',
  'Secretaria de Obras e Infraestrutura',
  'Secretaria de Saude',
  'Secretaria de Educacao',
  'Procuradoria Juridica',
  'Setor de Licitacoes e Contratos',
] as const

function formatarCNPJ(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 14)
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatarCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

export default function NovaPrefeituraPage() {
  const [passo, setPasso] = useState<1 | 2>(1)

  // Passo 1
  const [municipio,     setMunicipio]     = useState<MunicipioSimplificado | null>(null)
  const [termoBusca,    setTermoBusca]    = useState('')
  const [sugestoes,     setSugestoes]     = useState<MunicipioSimplificado[]>([])
  const [buscando,      setBuscando]      = useState(false)
  const [mostrarSugest, setMostrarSugest] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Passo 2 — prefeitura
  const [nomePref,    setNomePref]    = useState('')
  const [cnpj,        setCnpj]        = useState('')
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [bairro,      setBairro]      = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#112239')
  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Passo 2 — admin
  const [nomeCompleto,   setNomeCompleto]   = useState('')
  const [cargo,          setCargo]          = useState('')
  const [secretariaNome, setSecretariaNome] = useState('')
  const [email,          setEmail]          = useState('')
  const [senha,          setSenha]          = useState('')
  const [confirmSenha,   setConfirmSenha]   = useState('')

  const [carregando,   setCarregando]   = useState(false)
  const [concluido,    setConcluido]    = useState(false)
  const [cnpjJaExiste, setCnpjJaExiste] = useState(false)

  // Busca cidade (passo 1)
  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const res = await buscarMunicipios(termoBusca)
      setSugestoes(res)
      setMostrarSugest(true)
      setBuscando(false)
    }, 350)
  }, [termoBusca])

  function selecionarMunicipio(m: MunicipioSimplificado) {
    setMunicipio(m)
    setNomePref(nomePrefeitura(m))
    setMostrarSugest(false)
    setTermoBusca('')
    setPasso(2)
  }

  // Auto-preenchimento via ViaCEP
  async function buscarCep(cepFormatado: string) {
    const nums = cepFormatado.replace(/\D/g, '')
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json() as Record<string, string>
      if (!data.erro) {
        setLogradouro(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
      } else {
        toast.error('CEP nao encontrado.')
      }
    } catch {
      toast.error('Erro ao buscar CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cnpjNums = cnpj.replace(/\D/g, '')
    const cepNums  = cep.replace(/\D/g, '')
    if (cnpjNums.length !== 14) { toast.error('CNPJ deve ter 14 digitos.');   return }
    if (cepNums.length !== 8)   { toast.error('CEP deve ter 8 digitos.');     return }
    if (!secretariaNome)        { toast.error('Selecione sua secretaria.');   return }
    if (senha !== confirmSenha) { toast.error('As senhas nao coincidem.');    return }
    if (!municipio)             { toast.error('Selecione o municipio.');      return }

    setCarregando(true)

    const resultado = await cadastrarAdminOrg({
      email, senha, nomeCompleto,
      cargo:          cargo || undefined,
      secretariaNome,
      nomePrefeitura: nomePref,
      cnpjPrefeitura: cnpjNums,
      municipio:      municipio.nome,
      estado:         municipio.siglaEstado,
      cep:            cepNums,
      logradouro,
      numero,
      bairro,
      cor_primaria:   /^#[0-9a-fA-F]{6}$/.test(corPrimaria) ? corPrimaria : undefined,
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

    // Upload de logo (se selecionada)
    if (logoFile && resultado.orgId) {
      const fd = new FormData()
      fd.append('file', logoFile)
      await uploadOrgLogoRegistro(resultado.orgId, fd)
    }

    setConcluido(true)
    setCarregando(false)
  }

  // --- Telas de resultado ---

  if (concluido) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <Building2 className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Prefeitura registrada!</h2>
          <p className="text-sm text-muted-foreground">
            O cadastro de {nomePref} foi enviado. Confirme seu e-mail e aguarde a ativacao pelo administrador da plataforma. Apos a ativacao, faca login normalmente.
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
              <p className="text-sm mt-1">{nomePref} ja possui cadastro na plataforma.</p>
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

  // --- Formulário principal ---

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          {passo === 2 ? (
            <button type="button" onClick={() => setPasso(1)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          <CardTitle className="text-xl">Cadastrar Prefeitura</CardTitle>
        </div>
        <CardDescription>
          {passo === 1
            ? 'Busque sua cidade para comecar'
            : `${municipio?.nome} — ${municipio?.siglaEstado}`}
        </CardDescription>
      </CardHeader>

      {/* Passo 1: Busca de cidade */}
      {passo === 1 && (
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label>Nome da cidade</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite o nome da cidade..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="pl-8"
                autoComplete="off"
              />
              {buscando && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {mostrarSugest && sugestoes.length > 0 && (
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

      {/* Passo 2: Formulário completo */}
      {passo === 2 && municipio && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Confirmação da cidade */}
            <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="font-semibold">{nomePref}</div>
                <div className="text-xs text-muted-foreground">{municipio.nome}, {municipio.siglaEstado}</div>
              </div>
            </div>

            {/* Bloco: Dados da Prefeitura */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados da Prefeitura</div>

              <div className="space-y-2">
                <Label>Nome oficial</Label>
                <Input value={nomePref} onChange={e => setNomePref(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={cnpj}
                  onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              {/* Endereco via CEP */}
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={cep}
                    onChange={e => {
                      const v = formatarCEP(e.target.value)
                      setCep(v)
                      if (v.replace(/\D/g, '').length === 8) buscarCep(v)
                    }}
                    placeholder="00000-000"
                    className="pl-8"
                    required
                  />
                  {buscandoCep && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Preenchido automaticamente via CEP" required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2 col-span-1">
                  <Label>Numero</Label>
                  <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="S/N" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bairro</Label>
                  <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Preenchido via CEP" required />
                </div>
              </div>
            </div>

            {/* Bloco: Identidade Visual */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identidade Visual</div>
              <LogoFilePicker label="Logo / Brasao da Prefeitura" onSelect={setLogoFile} />
              <HexColorPickerField label="Cor primaria da prefeitura" value={corPrimaria} onChange={setCorPrimaria} />
            </div>

            {/* Bloco: Dados do Administrador */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seus Dados</div>

              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Secretario de Administracao" required />
              </div>

              <div className="space-y-2">
                <Label>Secretaria</Label>
                <Select onValueChange={(v: string | null) => { if (v) setSecretariaNome(v) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua secretaria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECRETARIAS_PADRAO.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>E-mail institucional</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@prefeitura.gov.br" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} minLength={8} required placeholder="Min 8 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar senha</Label>
                  <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a senha" />
                </div>
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
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
