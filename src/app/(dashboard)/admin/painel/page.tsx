import { createClient } from '@/lib/supabase/server'
import { Building2, Users, FileText, Bot, BookOpen, Zap } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { FooterEditorial } from '../../dashboard/shared'

export default async function AdminPainelPage() {
  const supabase = await createClient()

  const [
    { count: totalOrgs },
    { count: totalUsuarios },
    { count: totalProcessos },
    { count: totalAcoesIA },
    { count: totalDocumentosBase },
    { count: totalClausulasAprendidas },
    { count: totalClausulasAplicadas },
    { data: acoesRecentes },
  ] = await Promise.all([
    (supabase as any).from('organizacoes').select('id', { count: 'exact', head: true }),
    (supabase as any).from('usuarios').select('id', { count: 'exact', head: true }),
    (supabase as any).from('processos_licitatorios').select('id', { count: 'exact', head: true }),
    (supabase as any).from('acoes_ia').select('id', { count: 'exact', head: true }),
    (supabase as any).from('documentos_base').select('id', { count: 'exact', head: true }),
    (supabase as any).from('clausulas_aprendidas').select('id', { count: 'exact', head: true }),
    (supabase as any).from('clausulas_aplicadas').select('id', { count: 'exact', head: true }),
    (supabase as any)
      .from('acoes_ia')
      .select('provedor, modelo, tipo_acao, sucesso, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const tokensEconomizados = (totalClausulasAplicadas ?? 0) * 500

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
          <EditorialKicker
            kicker="Administracao da Plataforma"
            date={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).replace(/^./, c => c.toUpperCase())}
          />
          <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
            Lei 14.133/21
          </div>
        </div>
        <HeadlineSerif size="md" as="h1">Painel da plataforma.</HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          Dados consolidados em tempo real.
        </p>
      </div>

      {/* KPIs principais */}
      <KPIBar items={[
        { label: 'Organizacoes',  value: totalOrgs ?? 0,    sub: 'cadastradas',    sparkline: 'up',   delta: 'total',    deltaColor: 'success' },
        { label: 'Usuarios',      value: totalUsuarios ?? 0, sub: 'na plataforma', sparkline: 'up',   delta: 'total',    deltaColor: 'blue' },
        { label: 'Processos',     value: totalProcessos ?? 0, sub: 'criados',      sparkline: 'wave', delta: 'total',    deltaColor: 'blue' },
        { label: 'Chamadas de IA', value: totalAcoesIA ?? 0,  sub: 'chamadas',     sparkline: 'wave', delta: 'acumulado', deltaColor: 'muted' },
      ]} />

      {/* Base de Conhecimento */}
      <div>
        <p className="text-[9.5px] font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontFamily: 'var(--font-mono)' }}>
          Base de Conhecimento
        </p>
        <KPIBar items={[
          { label: 'Docs na base',     value: totalDocumentosBase ?? 0,    sub: 'documentos de referencia', sparkline: 'up', delta: 'total', deltaColor: 'success', accent: true },
          { label: 'Clausulas aprendidas', value: totalClausulasAprendidas ?? 0, sub: 'modelos consolidados', sparkline: 'up', delta: 'aprendidas', deltaColor: 'success' },
          { label: 'Tokens economizados', value: tokensEconomizados.toLocaleString('pt-BR'), sub: 'estimativa', sparkline: 'up', delta: `${totalClausulasAplicadas ?? 0} reusos`, deltaColor: 'success', accent: true },
        ]} />
      </div>

      {/* Atividade recente de IA */}
      <div className="space-y-3">
        <p className="text-[9.5px] font-bold uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontFamily: 'var(--font-mono)' }}>
          Atividade Recente de IA
        </p>
        <div className="glass rounded-[var(--r-lg)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}>
            <Bot className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Ultimas chamadas
            </h3>
          </div>
          {!acoesRecentes || acoesRecentes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma chamada de IA registrada ainda.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
              {(acoesRecentes as Array<{ provedor: string; modelo: string; tipo_acao: string; sucesso: boolean; created_at: string }>).map((acao, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="p-1.5 rounded-[var(--r-md)] shrink-0"
                    style={{ background: acao.sucesso ? 'var(--successWash)' : 'var(--dangerWash)' }}
                  >
                    {acao.sucesso
                      ? <Bot className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                      : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize" style={{ color: 'var(--ink)' }}>
                      {acao.provedor} <span className="font-normal" style={{ color: 'var(--muted)' }}>{acao.modelo}</span>
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
                      {acao.tipo_acao.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: acao.sucesso ? 'var(--successWash)' : 'var(--dangerWash)',
                        color: acao.sucesso ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {acao.sucesso ? 'Ok' : 'Erro'}
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {new Date(acao.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
