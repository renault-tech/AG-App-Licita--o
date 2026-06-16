import type { ReactNode } from 'react'
import type { RelatorioCotacao, ItemRelatorio, TipoFontePreco } from '@/lib/cotacao/types'
import { ROTULO_FONTE } from '@/lib/cotacao/types'
import { AlertTriangle, Globe } from 'lucide-react'

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataBR(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
}

function FonteWeb({ registros }: { registros: ItemRelatorio['fontes'][number]['registros'] }) {
  return (
    <div className="space-y-2">
      {registros.map((r) => (
        <div key={r.indice} className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 border-b border-gray-100 last:border-0">
          <span className="font-mono text-gray-400">{r.indice}</span>
          <span className="font-medium">{r.fonteNome}</span>
          <a href={r.url ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <Globe className="w-3 h-3" /> link
          </a>
          <span className="text-gray-500">{r.descricaoProduto}</span>
          <span className="text-gray-400">acesso: {dataHoraBR(r.dataHoraAcesso)}</span>
          <span className="ml-auto font-mono font-semibold">{brl(r.valorOriginal)}</span>
        </div>
      ))}
    </div>
  )
}

function FontePNCP({ registros }: { registros: ItemRelatorio['fontes'][number]['registros'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100">
            <th className="py-1.5 pr-2 font-medium">#</th>
            <th className="py-1.5 pr-2 font-medium">Orgao Publico</th>
            <th className="py-1.5 pr-2 font-medium">Identificacao</th>
            <th className="py-1.5 pr-2 font-medium">Data</th>
            <th className="py-1.5 pr-2 font-medium text-right">Original</th>
            <th className="py-1.5 pr-2 font-medium text-right">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.indice} className={r.isOutlier ? 'bg-amber-50' : ''}>
              <td className="py-1.5 pr-2 font-mono text-gray-400 align-top">{r.indice}</td>
              <td className="py-1.5 pr-2 align-top">
                <div className="font-medium text-gray-800">{r.orgaoNome ?? '—'}</div>
                <div className="text-gray-400">
                  {r.orgaoCnpj ? `CNPJ ${r.orgaoCnpj}` : 'CNPJ nao informado'}
                  {r.unidadeNome ? ` · ${r.unidadeNome}` : ''}
                </div>
              </td>
              <td className="py-1.5 pr-2 align-top font-mono text-gray-500">{r.identificacao}</td>
              <td className="py-1.5 pr-2 align-top whitespace-nowrap">{dataBR(r.dataLicitacao)}</td>
              <td className="py-1.5 pr-2 align-top text-right font-mono text-gray-500">{brl(r.valorOriginal)}</td>
              <td className="py-1.5 pr-2 align-top text-right font-mono font-semibold">
                {brl(r.valorAtualizado)}
                {r.isOutlier && (
                  <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" aria-label="Preco discrepante" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
              <AlertTriangle className="w-3 h-3" /> Precos insuficientes
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao}</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-100 text-center">
        <Resumo label="Precos util./encontr." valor={`${item.precosUtilizados} / ${item.propostasEncontradas}`} />
        <Resumo label="Quantidade" valor={`${item.quantidade} ${item.unidade}`} />
        <Resumo label="Mediana (teto)" valor={brl(item.mediana)} />
        <Resumo label="Media" valor={brl(item.media)} />
        <Resumo label="Preco estimado" valor={brl(item.precoEstCalculado)} destaque />
        <Resumo label="Total" valor={brl(item.total)} destaque />
      </div>

      {/* Fontes */}
      <div className="p-5 space-y-4">
        {item.fontes.map((fonte) => (
          <div key={fonte.tipo}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {ROTULO_FONTE[fonte.tipo as TipoFontePreco]}
              </span>
              <span className="text-xs text-gray-400">
                Valor unitario: <strong className="text-gray-700">{brl(fonte.valorUnitario)}</strong>
              </span>
            </div>
            {fonte.tipo === 'preco_web'
              ? <FonteWeb registros={fonte.registros} />
              : <FontePNCP registros={fonte.registros} />}
          </div>
        ))}
        {item.fontes.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">Nenhum preco encontrado para este item.</p>
        )}
        {item.avisos.map((aviso, i) => (
          <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {aviso}
          </p>
        ))}
        {acaoItem && item.id && <div className="pt-1">{acaoItem(item.id)}</div>}
      </div>
    </div>
  )
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`px-2 py-2.5 ${destaque ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xs font-semibold mt-0.5 ${destaque ? 'text-blue-900' : 'text-gray-800'}`}>{valor}</div>
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
