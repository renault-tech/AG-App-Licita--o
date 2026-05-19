'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, UserPlus, Building2, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cadastrarUsuario } from '@/lib/actions/auth-cadastro'
import { LABEL_PAPEL } from '@/lib/permissions'

// Papeis que um usuario pode solicitar no auto-cadastro (exclui admin_plataforma)
type PapelCadastravel =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'

const PAPEIS_CADASTRAVEIS: PapelCadastravel[] = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
]

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papelSolicitado, setPapelSolicitado] = useState<PapelCadastravel | ''>('')
  const [organizacaoId, setOrganizacaoId] = useState('')
  const [organizacoes, setOrganizacoes] = useState<{ id: string; nome: string }[]>([])
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [carregandoOrgs, setCarregandoOrgs] = useState(false)
  const [buscouOrgs, setBuscouOrgs] = useState(false)

  async function carregarOrganizacoes() {
    if (buscouOrgs) return
    setCarregandoOrgs(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('organizacoes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setOrganizacoes(data ?? [])
    setBuscouOrgs(true)
    setCarregandoOrgs(false)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!papelSolicitado) { toast.error('Selecione o seu papel na prefeitura.'); return }
    if (!organizacaoId) { toast.error('Selecione a sua prefeitura.'); return }

    setCarregando(true)
    const resultado = await cadastrarUsuario({
      email, senha, nomeCompleto: nome,
      papelSolicitado,
      organizacaoId,
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
            Confirme seu e-mail primeiro, depois aguarde a liberacao do acesso.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-xl">Solicitar Acesso</CardTitle>
          <CardDescription>Para uma prefeitura ja cadastrada na plataforma</CardDescription>
        </CardHeader>

        <form onSubmit={handleCadastro}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-cad">E-mail institucional</Label>
              <Input id="email-cad" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.gov.br" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha-cad">Senha (minimo 8 caracteres)</Label>
              <Input id="senha-cad" type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Prefeitura</Label>
              <Select onOpenChange={open => { if (open) carregarOrganizacoes() }} onValueChange={v => setOrganizacaoId(typeof v === 'string' ? v : '')}>
                <SelectTrigger>
                  <SelectValue placeholder={carregandoOrgs ? 'Carregando...' : 'Selecione sua prefeitura'} />
                </SelectTrigger>
                <SelectContent>
                  {organizacoes.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seu papel na prefeitura</Label>
              <Select onValueChange={v => setPapelSolicitado(v as PapelCadastravel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu papel" />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS_CADASTRAVEIS.map(p => (
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

      <Link
        href="/cadastro/nova-prefeitura"
        className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">Minha prefeitura nao esta cadastrada</div>
            <div className="text-xs text-muted-foreground">Cadastre sua prefeitura como administrador</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  )
}
