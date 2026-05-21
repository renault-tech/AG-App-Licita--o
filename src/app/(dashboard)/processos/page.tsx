import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, PlusCircle, ArrowRight, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import BotaoExcluirProcesso from './botao-excluir-processo'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregão Eletrônico',
  pregao_presencial:   'Pregão Presencial',
  concorrencia:        'Concorrência',
  concurso:            'Concurso',
  leilao:              'Leilão',
  dialogo_competitivo: 'Diálogo Competitivo',
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
    total:     lista.length,
    rascunho:  lista.filter((p: any) => p.status === 'rascunho').length,
    emRevisao: lista.filter((p: any) => p.status === 'em_revisao').length,
    concluidos: lista.filter((p: any) => p.status === 'publicado' || p.status === 'assinado').length,
  }

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div
          className="flex items-center justify-between pb-3.5 mb-6"
          style={{ borderBottom: '2px solid var(--rule)' }}
        >
          <EditorialKicker
            kicker="Processos Licitatórios"
            date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
          />
          <Link href="/processos/novo">
            <Button
              className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
              style={{ background: 'var(--primary)' }}
            >
              <PlusCircle className="w-4 h-4" />
              Novo processo
            </Button>
          </Link>
        </div>

        <HeadlineSerif size="md" as="h1">
          Processos em elaboração.
        </HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)' }}>
          {totais.total} processo{totais.total !== 1 ? 's' : ''} · {totais.emRevisao} em revisão
        </p>
      </div>

      {/* KPI rail */}
      <div
        className="grid grid-cols-4 overflow-hidden"
        style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}
      >
        {[
          { label: 'Total', valor: totais.total, sub: 'processos' },
          { label: 'Rascunho', valor: totais.rascunho, sub: 'em elaboração' },
          { label: 'Em revisão', valor: totais.emRevisao, sub: 'aguardando análise' },
          { label: 'Concluídos', valor: totais.concluidos, sub: 'publicados/assinados' },
        ].map((k, i, arr) => (
          <div key={k.label} className="px-5 pt-4 pb-3.5" style={{ borderRight: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
            <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{k.label}</div>
            <div
              className="l-h l-tnum"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 0.94, letterSpacing: '-0.03em', color: 'var(--ink)', fontWeight: 500 }}
            >
              {k.valor}
            </div>
            <div className="text-[11px] mt-2" style={{ color: 'var(--inkSoft)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Card header */}
        <div
          className="flex flex-row items-center justify-between px-6 py-5 border-b"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Processos
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {papel === 'requisitante' ? 'Processos que você criou' : 'Todos os processos da organização'}
            </p>
          </div>
          <Link href="/processos/novo">
            <Button variant="outline" size="sm" className="gap-1.5 text-sm h-9" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
              <PlusCircle className="w-4 h-4" /> Novo
            </Button>
          </Link>
        </div>

        {/* Conteúdo */}
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--primaryWash)' }}>
              <Gavel className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Nenhum processo encontrado
            </h3>
            <p className="text-[15px] max-w-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Clique em &quot;Novo Processo&quot; para iniciar a elaboração do primeiro processo licitatório.
            </p>
            <Link href="/processos/novo" className="mt-6">
              <Button className="text-white gap-2 text-sm h-10 px-5 rounded-[var(--r-md)]" style={{ background: 'var(--primary)' }}>
                <PlusCircle className="w-4 h-4" />
                Criar primeiro processo
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {lista.map((p: any) => {
              const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade
              const status = (p.status as StatusProcesso) ?? 'rascunho'
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-6 py-5 transition-colors group"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Link href={`/processos/${p.id}/dfd`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--primaryWash)' }}
                    >
                      <FileText className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {p.numero_processo ? `${p.numero_processo} — ` : ''}{p.objeto}
                      </p>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>{modalidade}</span>
                        {p.valor_estimado > 0 && (
                          <>
                            <span style={{ color: 'var(--hairline)' }}>|</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--inkSoft)' }}>
                              R$ {(p.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:block">
                        <StatusPill status={status} size="sm" />
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: 'var(--mutedSoft)' }} />
                    </div>
                  </Link>
                  <BotaoExcluirProcesso processoId={p.id} objeto={p.objeto} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
