import type { ReactNode } from 'react'
import type { RelatorioCotacao, ItemRelatorio } from '@/lib/cotacao/types'
import { AlertTriangle } from 'lucide-react'
import { ItemRegistros } from './item-registros'

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`px-2 py-2.5 ${destaque ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xs font-semibold mt-0.5 ${destaque ? 'text-blue-900' : 'text-gray-800'}`}>{valor}</div>
    </div>
  )
}

function ItemCard({ item, acaoItem }: { item: ItemRelatorio; acaoItem?: (itemId: string) => ReactNode }) {
  const pendente = item.status === 'pendente_insuficiente'
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabecalho do item */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gray-400">Item {item.numero}</span>
            <h3 className="text-sm font-semibold text-gray-900">{item.titulo}</h3>
          </div>
          {pendente && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3" /> Cotacoes insuficientes
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao}</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-100 text-center">
        <Resumo label="Cotacoes util./encontr." valor={`${item.precosUtilizados} / ${item.propostasEncontradas}`} />
        <Resumo label="Quantidade" valor={`${item.quantidade} ${item.unidade}`} />
        <Resumo label="Mediana (teto)" valor={brl(item.mediana)} />
        <Resumo label="Media" valor={brl(item.media)} />
        <Resumo label="Preco estimado" valor={brl(item.precoEstCalculado)} destaque />
        <Resumo label="Total" valor={brl(item.total)} destaque />
      </div>

      {/* Fontes e registros (com expansao das demais cotacoes) */}
      <ItemRegistros
        fontes={item.fontes}
        precosUtilizados={item.precosUtilizados}
        propostasEncontradas={item.propostasEncontradas}
      />

      {(item.avisos.length > 0 || (acaoItem && item.id)) && (
        <div className="px-5 pb-5 space-y-2">
          {item.avisos.map((aviso, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {aviso}
            </p>
          ))}
          {acaoItem && item.id && <div className="pt-1">{acaoItem(item.id)}</div>}
        </div>
      )}
    </div>
  )
}

export function RelatorioCotacaoTabela({
  relatorio,
  codigoValidacao,
  geradoEm,
  acaoItem,
}: {
  relatorio: RelatorioCotacao
  codigoValidacao?: string | null
  geradoEm?: string | null
  acaoItem?: (itemId: string) => ReactNode
}) {
  const INDICE_LABEL: Record<string, string> = { ipca: 'IPCA', igpm: 'IGP-M', inpc: 'INPC' }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <span>
          Indice de atualizacao: <strong>{INDICE_LABEL[relatorio.indiceAtualizacao] ?? relatorio.indiceAtualizacao}</strong>
          {!relatorio.indiceDisponivel && (
            <span className="text-amber-600"> (fonte de indice indisponivel, valores sem correcao)</span>
          )}
        </span>
        <span>
          Valor total geral: <strong className="text-gray-900">{brl(relatorio.valorTotalGeral)}</strong>
        </span>
      </div>

      {relatorio.itens.map((item) => (
        <ItemCard key={item.numero} item={item} acaoItem={acaoItem} />
      ))}

      {/* Rodape do relatorio */}
      <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-3 flex flex-wrap justify-between gap-2">
        <span>Gerado em: {dataHoraBR(geradoEm)}</span>
        {codigoValidacao && <span>Codigo de validacao: <span className="font-mono">{codigoValidacao}</span></span>}
        <span>Fonte: PNCP / Compras.gov.br · Lei 14.133/2021, Art. 23</span>
      </div>
      <p className="text-[10px] text-gray-400 italic">
        Documento gerado com auxilio de inteligencia artificial. A revisao e validacao do conteudo sao de
        responsabilidade do agente publico signatario, nos termos da Lei 14.133/2021.
      </p>
    </div>
  )
}
