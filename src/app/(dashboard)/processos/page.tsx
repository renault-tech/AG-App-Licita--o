import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  FileText, PlusCircle, ArrowRight, Clock,
  CheckCircle, Gavel, Filter, Share2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { obterPapelUsuario } from '@/lib/actions/usuario'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  rascunho:   { label: 'Rascunho',   bg: '#F4F3F7', color: '#43474E', border: '#E3E2E6' },
  em_revisao: { label: 'Em Revisao', bg: '#FFF8EC', color: '#7A5A1E', border: '#F0D9A8' },
  assinado:   { label: 'Assinado',   bg: '#EFF4FF', color: '#1A365D', border: '#C4D4F0' },
  publicado:  { label: 'Publicado',  bg: '#F0FAF4', color: '#1A6637', border: '#B3DFC5' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregao Eletronico',
  pregao_presencial:   'Pregao Presencial',
  concorrencia:        'Concorrencia',
  concurso:            'Concurso',
  leilao:              'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

export default async function ProcessosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const organizacaoId = (usuarioData as any)?.organizacao_id
  if (!organizacaoId) redirect('/dashboard')

  // Buscar processos conforme papel
  let query = supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .order('created_at', { ascending: false })

  if (papel === 'requisitante') {
    query = query.eq('criado_por', user.id)
  } else {
    query = query.eq('organizacao_id', organizacaoId)
  }

  const { data: processos } = await query
  const lista = (processos as any[] | null) ?? []

  const totais = {
    total: lista.length,
    rascunho: lista.filter((p: any) => p.status === 'rascunho').length,
    emRevisao: lista.filter((p: any) => p.status === 'em_revisao').length,
    concluidos: lista.filter((p: any) => p.status === 'publicado' || p.status === 'assinado').length,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#B7935E] uppercase tracking-widest mb-1.5">Processos Licitatorios</p>
          <h1 className="text-3xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            Todos os Processos
          </h1>
          <p className="text-[15px] text-[#74777F] mt-1.5">
            {totais.total} processo{totais.total !== 1 ? 's' : ''} encontrado{totais.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/processos/novo">
          <Button
            className="text-white h-10 px-5 text-sm font-semibold gap-2 rounded-lg"
            style={{ backgroundColor: '#B7935E' }}
          >
            <PlusCircle className="w-4 h-4" />
            Novo Processo
          </Button>
        </Link>
      </div>

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-[#E3E2E6] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1A365D10' }}>
            <FileText className="w-5 h-5" style={{ color: '#1A365D' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>{totais.total}</p>
            <p className="text-sm text-[#74777F]">Total</p>
          </div>
        </div>
        <div className="bg-white border border-[#E3E2E6] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#43474E10' }}>
            <Clock className="w-5 h-5" style={{ color: '#43474E' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>{totais.rascunho}</p>
            <p className="text-sm text-[#74777F]">Rascunhos</p>
          </div>
        </div>
        <div className="bg-white border border-[#E3E2E6] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#B7935E10' }}>
            <Filter className="w-5 h-5" style={{ color: '#B7935E' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>{totais.emRevisao}</p>
            <p className="text-sm text-[#74777F]">Em Revisao</p>
          </div>
        </div>
        <div className="bg-white border border-[#E3E2E6] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1A663710' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#1A6637' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>{totais.concluidos}</p>
            <p className="text-sm text-[#74777F]">Concluidos</p>
          </div>
        </div>
      </div>

      {/* Lista */}
      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
              Processos
            </CardTitle>
            <CardDescription className="text-sm mt-1 text-[#74777F]">
              {papel === 'requisitante' ? 'Processos que voce criou' : 'Todos os processos da organizacao'}
            </CardDescription>
          </div>
          <Link href="/processos/novo">
            <Button variant="outline" size="sm" className="gap-1.5 text-sm h-9 border-[#E3E2E6] text-[#1A365D] hover:bg-[#F4F3F7]">
              <PlusCircle className="w-4 h-4" />
              Novo
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#1A365D0D' }}>
                <Gavel className="w-7 h-7" style={{ color: '#1A365D' }} />
              </div>
              <h3 className="text-lg font-semibold text-[#1A365D] mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                Nenhum processo encontrado
              </h3>
              <p className="text-[15px] text-[#74777F] max-w-sm leading-relaxed">
                Clique em &quot;Novo Processo&quot; para iniciar a elaboracao do primeiro processo licitatorio.
              </p>
              <Link href="/processos/novo" className="mt-6">
                <Button className="text-white gap-2 text-sm h-10 px-5 rounded-lg" style={{ backgroundColor: '#B7935E' }}>
                  <PlusCircle className="w-4 h-4" />
                  Criar primeiro processo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {lista.map((p: any) => {
                const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade
                const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG['rascunho']
                return (
                  <Link
                    key={p.id}
                    href={`/processos/${p.id}/dfd`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#1A365D0D' }}
                    >
                      <FileText className="w-[18px] h-[18px]" style={{ color: '#1A365D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#1A1C1E] truncate">
                        {p.numero_processo ? `${p.numero_processo} - ` : ''}{p.objeto}
                      </p>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-sm text-[#74777F]">{modalidade}</span>
                        {p.valor_estimado > 0 && (
                          <>
                            <span className="text-[#C4C6CF]">|</span>
                            <span className="text-sm text-[#43474E] font-medium">
                              R$ {(p.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs font-medium px-2.5 py-1 border hidden sm:inline"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border, borderRadius: '3px' }}
                      >
                        {statusCfg.label}
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
