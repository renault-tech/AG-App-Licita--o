import { createClient } from '@/lib/supabase/server'
import { Building2, Users, FileText, Bot, BookOpen, Zap, HelpCircle } from 'lucide-react'

interface KpiCardProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  icon: React.ElementType
  tooltip: string
  accent?: boolean
}

function KpiCard({ titulo, valor, subtitulo, icon: Icon, tooltip, accent = false }: KpiCardProps) {
  const iconColor = accent ? '#B7935E' : '#1A365D'
  const iconBg   = accent ? '#B7935E10' : '#1A365D0D'

  return (
    <div
      className="bg-white border border-[#E3E2E6] rounded-xl p-5 flex flex-col gap-4 transition-shadow hover:shadow-[0_4px_12px_rgba(26,54,93,0.06)]"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div className="group relative">
          <HelpCircle className="w-3.5 h-3.5 cursor-help transition-colors" style={{ color: '#C4C6CF' }} />
          <span
            className="pointer-events-none absolute right-5 top-0 z-50 hidden group-hover:block w-52 p-2.5 text-white text-[11px] rounded-xl shadow-xl leading-relaxed"
            style={{ backgroundColor: '#2F3033', boxShadow: '0 12px 32px rgba(26,54,93,0.2)' }}
          >
            {tooltip}
          </span>
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-bold text-[#1A365D]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {valor}
        </p>
        <p className="text-sm text-[#43474E] mt-0.5">{titulo}</p>
        {subtitulo && <p className="text-xs text-[#74777F] mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  )
}

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

      {/* Titulo com kicker */}
      <div>
        <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">
          Visao Geral
        </p>
        <h2
          className="text-xl font-bold text-[#1A365D]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Painel da Plataforma
        </h2>
        <p className="text-sm text-[#74777F] mt-0.5">
          Dados consolidados em tempo real.
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Organizacoes"
          valor={totalOrgs ?? 0}
          icon={Building2}
          tooltip="Total de prefeituras e orgaos publicos cadastrados na plataforma."
        />
        <KpiCard
          titulo="Usuarios"
          valor={totalUsuarios ?? 0}
          icon={Users}
          tooltip="Total de usuarios cadastrados em todas as organizacoes."
        />
        <KpiCard
          titulo="Processos"
          valor={totalProcessos ?? 0}
          icon={FileText}
          tooltip="Total de processos licitatorios criados em toda a plataforma."
        />
        <KpiCard
          titulo="Chamadas de IA"
          valor={totalAcoesIA ?? 0}
          icon={Bot}
          tooltip="Total de chamadas realizadas a provedores de IA desde o inicio da plataforma."
        />
      </div>

      {/* Secao de aprendizado */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest">
            Base de Conhecimento
          </p>
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: '#C4C6CF' }} />
            <span
              className="pointer-events-none absolute left-5 top-0 z-50 hidden group-hover:block w-64 p-2.5 text-white text-[11px] rounded-xl shadow-xl leading-relaxed"
              style={{ backgroundColor: '#2F3033', boxShadow: '0 12px 32px rgba(26,54,93,0.2)' }}
            >
              Quanto mais documentos na base e clausulas aprendidas, menor o custo de IA por processo gerado.
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            titulo="Documentos na Base"
            valor={totalDocumentosBase ?? 0}
            subtitulo="documentos de referencia enviados"
            icon={BookOpen}
            accent
            tooltip="Documentos reais de licitacao enviados pelo admin para treinamento da IA."
          />
          <KpiCard
            titulo="Clausulas Aprendidas"
            valor={totalClausulasAprendidas ?? 0}
            subtitulo="modelos de texto consolidados"
            icon={Bot}
            tooltip="Textos aprovados e consolidados que a IA reutiliza sem precisar gerar novamente."
          />
          <KpiCard
            titulo="Tokens Economizados"
            valor={tokensEconomizados.toLocaleString('pt-BR')}
            subtitulo={`${totalClausulasAplicadas ?? 0} reuso(s) de clausulas`}
            icon={Zap}
            accent
            tooltip="Estimativa de tokens que deixaram de ser consumidos porque a plataforma reutilizou clausulas aprendidas."
          />
        </div>
      </div>

      {/* Atividade recente de IA */}
      <div>
        <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-4">
          Atividade Recente de IA
        </p>
        <div
          className="bg-white border border-[#E3E2E6] rounded-xl overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}
        >
          {!acoesRecentes || acoesRecentes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#74777F]">
              Nenhuma chamada de IA registrada ainda.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E2E6] bg-[#FAFAFA]">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#74777F] uppercase tracking-wide">Provedor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#74777F] uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#74777F] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#74777F] uppercase tracking-wide">Data</th>
                </tr>
              </thead>
              <tbody>
                {(acoesRecentes as Array<{ provedor: string; modelo: string; tipo_acao: string; sucesso: boolean; created_at: string }>).map((acao, i) => (
                  <tr key={i} className="border-b border-[#F4F3F7] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-semibold text-[#1A365D] capitalize">{acao.provedor}</span>
                      <span className="ml-1.5 text-xs text-[#74777F]">{acao.modelo}</span>
                    </td>
                    <td className="px-4 py-3 text-[#43474E] capitalize text-[13px]">
                      {acao.tipo_acao.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      {acao.sucesso ? (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 border"
                          style={{ backgroundColor: '#F0FAF4', color: '#1A6637', borderColor: '#B3DFC5', borderRadius: '2px' }}
                        >
                          Ok
                        </span>
                      ) : (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 border"
                          style={{ backgroundColor: '#FFF0F0', color: '#BA1A1A', borderColor: '#FFBBB5', borderRadius: '2px' }}
                        >
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#74777F] text-xs">
                      {new Date(acao.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}