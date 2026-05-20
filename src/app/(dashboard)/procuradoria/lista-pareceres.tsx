'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Scale } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { ParecerListItem } from '@/lib/actions/procuradoria'

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

function calcularBadgeUrgencia(
  dataEnvio: string | null,
  prazoUrgencia: number,
  prazoAlerta: number
): { tipo: 'urgente' | 'atencao' | 'novo' | null; diasDecorridos: number } {
  if (!dataEnvio) return { tipo: null, diasDecorridos: 0 }
  const hoje  = new Date()
  const envio = new Date(dataEnvio)
  const diasDecorridos = Math.floor((hoje.getTime() - envio.getTime()) / (1000 * 60 * 60 * 24))

  if (diasDecorridos >= prazoUrgencia) return { tipo: 'urgente', diasDecorridos }
  if (diasDecorridos >= prazoAlerta)   return { tipo: 'atencao', diasDecorridos }
  if (diasDecorridos < 2)              return { tipo: 'novo',    diasDecorridos }
  return { tipo: null, diasDecorridos }
}

function BadgeUrgencia({ tipo }: { tipo: 'urgente' | 'atencao' | 'novo' | null }) {
  if (!tipo) return null
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    urgente: { label: 'URGENTE', bg: 'var(--dangerWash)',  color: 'var(--danger)' },
    atencao: { label: 'ATENÇÃO', bg: 'var(--warnWash)',    color: 'var(--warn)'   },
    novo:    { label: 'NOVO',    bg: 'var(--successWash)', color: 'var(--success)' },
  }
  const { label, bg, color } = cfg[tipo]
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--r-pill)]"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

function ItemParecer({
  item,
  prazoUrgencia,
  prazoAlerta,
}: {
  item: ParecerListItem
  prazoUrgencia: number
  prazoAlerta: number
}) {
  const { tipo, diasDecorridos } = calcularBadgeUrgencia(
    item.data_envio_procuradoria,
    prazoUrgencia,
    prazoAlerta
  )
  const temConteudo    = item.status !== 'pendente'
  const labelBotao     = temConteudo ? 'Abrir parecer' : 'Criar parecer'
  const valorFormatado = item.processo.valor_estimado
    ? `R$ ${item.processo.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : null

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: '1px solid var(--hairline)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div
        className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--primaryWash)' }}
      >
        <Scale className="w-4 h-4" style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
          {item.processo.numero_processo && (
            <span className="font-normal mr-1" style={{ color: 'var(--muted)' }}>
              {item.processo.numero_processo} -
            </span>
          )}
          {item.processo.objeto}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          <span>{MODALIDADE_LABEL[item.processo.modalidade] ?? item.processo.modalidade}</span>
          {valorFormatado && <><span>·</span><span>{valorFormatado}</span></>}
          {item.processo.secretaria_nome && <><span>·</span><span>{item.processo.secretaria_nome}</span></>}
          {item.data_envio_procuradoria && (
            <>
              <span>·</span>
              <span style={tipo === 'urgente' ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                Enviado há {diasDecorridos === 0 ? 'hoje' : diasDecorridos === 1 ? 'ontem' : `${diasDecorridos} dias`}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <BadgeUrgencia tipo={tipo} />
        <Link href={`/processos/${item.processo_id}/parecer`}>
          <Button
            variant={temConteudo ? 'outline' : 'default'}
            size="sm"
            className="h-8 text-xs"
            style={!temConteudo ? { background: 'var(--primary)', color: '#fff', border: 'none' } : { borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
          >
            {labelBotao} →
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function ListaPareceres({
  pareceres,
  prazoUrgenciaDias,
  prazoAlertaDias,
}: {
  pareceres: ParecerListItem[]
  prazoUrgenciaDias: number
  prazoAlertaDias: number
}) {
  const pendentes = useMemo(() => pareceres.filter(p => p.status === 'pendente'), [pareceres])
  const emAnalise = useMemo(() => pareceres.filter(p => p.status === 'em_analise'), [pareceres])
  const historico = useMemo(() => pareceres.filter(p =>
    ['aprovado', 'aprovado_com_ressalvas', 'contrario', 'devolvido'].includes(p.status)
  ), [pareceres])

  const agora      = new Date()
  const emitidosMes = useMemo(() => historico.filter(p => {
    const d = new Date(p.created_at)
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
  }).length, [historico])

  return (
    <div className="space-y-5">
      {/* KPIs mini */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-[var(--r-lg)] p-4"
          style={{
            background: 'var(--surface)',
            border: `1px solid var(--hairline)`,
            borderLeft: pendentes.length > 0 ? '4px solid var(--danger)' : '1px solid var(--hairline)',
          }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: pendentes.length > 0 ? 'var(--danger)' : 'var(--mutedSoft)' }}
          >
            {pendentes.length}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Pendentes</div>
        </div>
        <div
          className="rounded-[var(--r-lg)] p-4"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            borderLeft: '4px solid var(--warn)',
          }}
        >
          <div className="text-2xl font-bold" style={{ color: 'var(--warn)' }}>{emAnalise.length}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Em análise</div>
        </div>
        <div
          className="rounded-[var(--r-lg)] p-4"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            borderLeft: '4px solid var(--success)',
          }}
        >
          <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{emitidosMes}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Emitidos este mês</div>
        </div>
      </div>

      {/* Abas */}
      <Tabs defaultValue="pendentes">
        <TabsList
          className="w-full justify-start gap-0 h-auto p-0 rounded-t-[var(--r-lg)] rounded-b-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderBottom: 'none' }}
        >
          <TabsTrigger
            value="pendentes"
            className="rounded-none rounded-tl-[var(--r-lg)] px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:shadow-none"
            style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
          >
            Pendentes
            {pendentes.length > 0 && (
              <span
                className="ml-2 text-[10px] rounded-full px-1.5 py-0.5 text-white"
                style={{ background: 'var(--danger)' }}
              >
                {pendentes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="em_analise"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:shadow-none"
          >
            Em análise
            {emAnalise.length > 0 && (
              <span
                className="ml-2 text-[10px] rounded-full px-1.5 py-0.5"
                style={{ background: 'var(--surfaceSink)', color: 'var(--inkSoft)' }}
              >
                {emAnalise.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:shadow-none"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <div
          className="rounded-b-[var(--r-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderTop: 'none' }}
        >
          <TabsContent value="pendentes" className="mt-0">
            {pendentes.length === 0
              ? <p className="text-center text-sm py-10" style={{ color: 'var(--mutedSoft)' }}>Nenhum parecer pendente.</p>
              : pendentes.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="em_analise" className="mt-0">
            {emAnalise.length === 0
              ? <p className="text-center text-sm py-10" style={{ color: 'var(--mutedSoft)' }}>Nenhum parecer em análise.</p>
              : emAnalise.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="historico" className="mt-0">
            {historico.length === 0
              ? <p className="text-center text-sm py-10" style={{ color: 'var(--mutedSoft)' }}>Nenhum parecer emitido ainda.</p>
              : [...historico].reverse().map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
