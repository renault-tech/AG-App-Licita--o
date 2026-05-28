'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Building2, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cadastrarAdminOrg } from '@/lib/actions/auth-cadastro'
import { marcarConviteAceito } from '@/lib/actions/convites'

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

interface Props {
  token: string
  emailDestino: string
  nomePrefeitura?: string
  municipio?: string
  estado?: string
}

export default function FormCadastroConvidado({ token, emailDestino, nomePrefeitura, municipio, estado }: Props) {
  const [nomePref,       setNomePref]       = useState(nomePrefeitura ?? '')
  const [cnpj,           setCnpj]           = useState('')
  const [cep,            setCep]            = useState('')
  const [logradouro,     setLogradouro]     = useState('')
  const [numero,         setNumero]         = useState('')
  const [bairro,         setBairro]         = useState('')
  const [nomeCompleto,   setNomeCompleto]   = useState('')
  const [cargo,          setCargo]          = useState('')
  const [secretariaNome, setSecretariaNome] = useState('')
  const [senha,          setSenha]          = useState('')
  const [confirmSenha,   setConfirmSenha]   = useState('')
  const [buscandoCep,    setBuscandoCep]    = useState(false)
  const [carregando,     setCarregando]     = useState(false)
  const [concluido,      setConcluido]      = useState(false)

  async function buscarCep(cepFormatado: string) {
    const nums = cepFormatado.replace(/\D/g, '')
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json() as Record<string, string>
      if (!data.erro) { setLogradouro(data.logradouro ?? ''); setBairro(data.bairro ?? '') }
      else toast.error('CEP nao encontrado.')
    } catch { toast.error('Erro ao buscar CEP.') }
    finally { setBuscandoCep(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (senha !== confirmSenha) { toast.error('As senhas nao coincidem.'); return }
    if (!secretariaNome)        { toast.error('Selecione a secretaria.'); return }

    const cnpjNums = cnpj.replace(/\D/g, '')
    const cepNums  = cep.replace(/\D/g, '')
    if (cnpjNums.length !== 14) { toast.error('CNPJ deve ter 14 digitos.'); return }
    if (cepNums.length !== 8)   { toast.error('CEP deve ter 8 digitos.');   return }

    setCarregando(true)
    const resultado = await cadastrarAdminOrg({
      email:          emailDestino,
      senha,
      nomeCompleto,
      cargo:          cargo || undefined,
      secretariaNome,
      nomePrefeitura: nomePref,
      cnpjPrefeitura: cnpjNums,
      municipio:      municipio ?? '',
      estado:         estado ?? '',
      cep:            cepNums,
      logradouro,
      numero,
      bairro,
    })

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro ao cadastrar. Tente novamente.')
      setCarregando(false)
      return
    }

    await marcarConviteAceito(token)
    setConcluido(true)
    setCarregando(false)
  }

  if (concluido) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'var(--success)' }} />
          <h2 className="text-lg font-semibold">Prefeitura cadastrada!</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Enviamos um e-mail de confirmacao para <strong>{emailDestino}</strong>. Clique no link do e-mail para ativar seu acesso e entrar na plataforma.
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Apos confirmar o e-mail, sua conta ficara disponivel para ativacao pelo administrador da plataforma.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <CardTitle className="text-xl">Cadastro de Prefeitura</CardTitle>
          </div>
          <Link
            href="/login"
            className="text-xs font-medium underline underline-offset-2"
            style={{ color: 'var(--muted)' }}
          >
            Ja tenho conta
          </Link>
        </div>
        <CardDescription>
          Voce foi convidado para cadastrar a prefeitura na plataforma LicitaIA.
          {(municipio || estado) && ` Municipio: ${[municipio, estado].filter(Boolean).join(' ')}.`}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          {/* E-mail bloqueado (vem do convite) */}
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={emailDestino} disabled className="opacity-60" />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>E-mail definido pelo convite.</p>
          </div>

          {/* Dados da prefeitura */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Dados da Prefeitura</div>

            <div className="space-y-1.5">
              <Label>Nome oficial</Label>
              <Input value={nomePref} onChange={e => setNomePref(e.target.value)} required placeholder="Prefeitura Municipal de..." />
            </div>

            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={cep}
                  onChange={e => { const v = formatarCEP(e.target.value); setCep(v); if (v.replace(/\D/g,'').length === 8) buscarCep(v) }}
                  placeholder="00000-000"
                  className="pl-8"
                  required
                />
                {buscandoCep && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Logradouro</Label>
              <Input value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Preenchido automaticamente via CEP" required />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Numero</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="S/N" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Preenchido via CEP" required />
              </div>
            </div>
          </div>

          {/* Dados do administrador */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Seus Dados</div>

            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Secretario de Administracao" required />
            </div>

            <div className="space-y-1.5">
              <Label>Secretaria</Label>
              <Select onValueChange={(v: string | null) => { if (v) setSecretariaNome(v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua secretaria..." />
                </SelectTrigger>
                <SelectContent>
                  {SECRETARIAS_PADRAO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} minLength={8} required placeholder="Min 8 caracteres" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar senha</Label>
                <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a senha" />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
              : <><Building2 className="w-4 h-4 mr-2" /> Finalizar cadastro</>
            }
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
