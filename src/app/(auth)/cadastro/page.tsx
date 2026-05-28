'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cadastrarUsuario } from '@/lib/actions/auth-cadastro'
import { LABEL_PAPEL } from '@/lib/permissions'
import { useAuthBranding } from '@/lib/auth/branding-context'

type PapelCadastravel =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'

const PAPEIS: PapelCadastravel[] = [
  'requisitante', 'setor_compras', 'setor_licitacao',
  'procurador', 'gestor_publico', 'publicacao',
]

export default function CadastroPage() {
  const { branding, setBrandingByOrgId } = useAuthBranding()

  const [nome,            setNome]          = useState('')
  const [email,           setEmail]         = useState('')
  const [senha,           setSenha]         = useState('')
  const [confirmSenha,    setConfirmSenha]  = useState('')
  const [organizacaoId,   setOrganizacaoId] = useState('')
  const [secretariaId,    setSecretariaId]  = useState('')
  const [papelSolicitado, setPapel]         = useState<PapelCadastravel | ''>('')
  const [carregando,      setCarregando]    = useState(false)
  const [enviado,         setEnviado]       = useState(false)

  const [orgs,           setOrgs]           = useState<{ id: string; nome: string }[]>([])
  const [orgsCarregadas, setOrgsCarregadas] = useState(false)

  async function carregarOrgs() {
    if (orgsCarregadas) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('organizacoes').select('id, nome').eq('ativo', true).order('nome')
    setOrgs((data ?? []) as { id: string; nome: string }[])
    setOrgsCarregadas(true)
  }

  async function handleOrgSelect(id: string | null) {
    if (!id) return
    setOrganizacaoId(id)
    setSecretariaId('')
    await setBrandingByOrgId(id)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!papelSolicitado)       { toast.error('Selecione o seu perfil de acesso.'); return }
    if (!organizacaoId)         { toast.error('Selecione a sua prefeitura.'); return }
    if (senha !== confirmSenha) { toast.error('As senhas nao coincidem.'); return }

    setCarregando(true)
    const resultado = await cadastrarUsuario({
      email,
      senha,
      nomeCompleto:    nome,
      papelSolicitado,
      organizacaoId,
      secretariaId:    secretariaId || undefined,
    })

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }
    setEnviado(true)
    setCarregando(false)
  }

  if (enviado) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <h2 className="text-lg font-semibold">Solicitacao enviada!</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada e aguarda aprovacao do administrador da sua prefeitura.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl">Solicitar Acesso</CardTitle>
        <CardDescription>Para uma prefeitura ja cadastrada na plataforma</CardDescription>
      </CardHeader>

      <form onSubmit={handleCadastro}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Seu nome completo" />
          </div>

          <div className="space-y-2">
            <Label>E-mail institucional</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.gov.br" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="Min 8 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a senha" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prefeitura</Label>
            <Select
              onOpenChange={open => { if (open) carregarOrgs() }}
              onValueChange={handleOrgSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua prefeitura..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Secretaria carregada apos selecionar org via branding context */}
          <div className="space-y-2">
            <Label>Secretaria</Label>
            <Select
              disabled={!organizacaoId || !branding.secretarias.length}
              onValueChange={(v: string | null) => setSecretariaId(v !== null ? v : '')}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !organizacaoId ? 'Selecione a prefeitura primeiro' : 'Selecione sua secretaria...'
                } />
              </SelectTrigger>
              <SelectContent>
                {branding.secretarias.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select onValueChange={v => setPapel(v as PapelCadastravel)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu perfil..." />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map(p => (
                  <SelectItem key={p} value={p}>{LABEL_PAPEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
              : <><UserPlus className="w-4 h-4 mr-2" /> Solicitar acesso</>
            }
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Ja tem acesso?{' '}
            <Link href="/login" className="font-semibold hover:underline">Entrar</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
