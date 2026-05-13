'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Scale } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ParecerListItem } from '@/lib/actions/procuradoria'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia:      'Concorrencia',
  concurso:          'Concurso',
  leilao:            'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:          'Dispensa',
  inexigibilidade:   'Inexigibilidade',
}

function calcularBadgeUrgencia(
  dataEnvio: string | null,
  prazoUrgencia: number,
  prazoAlerta: number
): { tipo: 'urgente' | 'atencao' | 'novo' | null; diasDecorridos: number } {
  if (!dataEnvio) return { tipo: null, diasDecorridos: 0 }
  const hoje = new Date()
  const envio = new Date(dataEnvio)
  const diasDecorridos = Math.floor((hoje.getTime() - envio.getTime()) / (1000 * 60 * 60 * 24))

  if (diasDecorridos >= prazoUrgencia) return { tipo: 'urgente',  diasDecorridos }
  if (diasDecorridos >= prazoAlerta)   return { tipo: 'atencao',  diasDecorridos }
  if (diasDecorridos < 2)              return { tipo: 'novo',     diasDecorridos }
  return { tipo: null, diasDecorridos }
}

function BadgeUrgencia({ tipo }: { tipo: 'urgente' | 'atencao' | 'novo' | null }) {
  if (!tipo) return null
  const cfg = {
    urgente: { label: 'URGENTE', className: 'bg-red-50 text-red-700 border-red-200' },
    atencao: { label: 'ATENCAO', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    novo:    { label: 'NOVO',    className: 'bg-green-50 text-green-700 border-green-200' },
  }[tipo]
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${cfg.className}`}>
      {cfg.label}
    </Badge>
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
  const temConteudo = item.status !== 'pendente'
  const labelBotao = temConteudo ? 'Abrir parecer' : 'Criar parecer'
  const valorFormatado = item.processo.valor_estimado
    ? `R$ ${item.processo.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : null

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
        <Scale className="w-4 h-4 text-blue-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {item.processo.numero_processo && (
            <span className="text-gray-500 font-normal mr-1">{item.processo.numero_processo} —</span>
          )}
          {item.processo.objeto}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
          <span>{MODALIDADE_LABEL[item.processo.modalidade] ?? item.processo.modalidade}</span>
          {valorFormatado && <><span>·</span><span>{valorFormatado}</span></>}
          {item.processo.secretaria_nome && <><span>·</span><span>{item.processo.secretaria_nome}</span></>}
          {item.data_envio_procuradoria && (
            <>
              <span>·</span>
              <span className={tipo === 'urgente' ? 'text-red-600 font-semibold' : ''}>
                Enviado ha {diasDecorridos === 0 ? 'hoje' : diasDecorridos === 1 ? 'ontem' : `${diasDecorridos} dias`}
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
            className={temConteudo
              ? 'h-8 text-xs border-gray-200 text-gray-700'
              : 'h-8 text-xs bg-[#1A365D] hover:bg-[#1A365D]/90 text-white'}
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
  const pendentes   = useMemo(() => pareceres.filter(p => p.status === 'pendente'), [pareceres])
  const emAnalise   = useMemo(() => pareceres.filter(p => p.status === 'em_analise'), [pareceres])
  const historico   = useMemo(() => pareceres.filter(p =>
    ['aprovado', 'aprovado_com_ressalvas', 'contrario', 'devolvido'].includes(p.status)
  ), [pareceres])

  const agora = new Date()
  const emitidosMes = useMemo(() => historico.filter(p => {
    const d = new Date(p.created_at)
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
  }).length, [historico])

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-white border rounded-xl p-4 ${pendentes.length > 0 ? 'border-l-4 border-l-red-500' : 'border-gray-200'}`}>
          <div className={`text-2xl font-bold ${pendentes.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pendentes.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Pendentes</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 border-l-4 border-l-amber-500">
          <div className="text-2xl font-bold text-amber-600">{emAnalise.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Em analise</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 border-l-4 border-l-green-500">
          <div className="text-2xl font-bold text-green-600">{emitidosMes}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Emitidos este mes</div>
        </div>
      </div>

      {/* Abas */}
      <Tabs defaultValue="pendentes">
        <TabsList className="bg-white border border-gray-200 rounded-t-xl rounded-b-none w-full justify-start gap-0 h-auto p-0">
          <TabsTrigger
            value="pendentes"
            className="rounded-none rounded-tl-xl px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Pendentes
            {pendentes.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendentes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="em_analise"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Em analise
            {emAnalise.length > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 text-[10px] rounded-full px-1.5 py-0.5">{emAnalise.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Historico
          </TabsTrigger>
        </TabsList>

        <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl">
          <TabsContent value="pendentes" className="mt-0">
            {pendentes.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer pendente.</p>
              : pendentes.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="em_analise" className="mt-0">
            {emAnalise.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer em analise.</p>
              : emAnalise.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="historico" className="mt-0">
            {historico.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer emitido ainda.</p>
              : [...historico].reverse().map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
