'use client'

import { useState } from 'react'
import type { FonteRelatorio, RegistroRelatorio, TipoFontePreco } from '@/lib/cotacao/types'
import { ROTULO_FONTE } from '@/lib/cotacao/types'
import { AlertTriangle, Globe, ChevronDown, ChevronUp } from 'lucide-react'

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBR(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR')
}
function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

function FonteWeb({ registros }: { registros: RegistroRelatorio[] }) {
  return (
    <div className="space-y-2">
      {registros.map((r) => (
        <div
          key={r.indice}
          className={`text-xs flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 border-b border-gray-100 last:border-0 ${r.utilizado ? '' : 'opacity-60'}`}
        >
          <span className="font-mono text-gray-400">{r.indice}</span>
          <span className="font-medium">{r.fonteNome}</span>
          <a href={r.url ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <Globe className="w-3 h-3" /> link
          </a>
          <span className="text-gray-500">{r.descricaoProduto}</span>
          <span className="text-gray-400">acesso: {dataHoraBR(r.dataHoraAcesso)}</span>
          {!r.utilizado && <span className="text-[10px] uppercase text-gray-400">nao utilizada</span>}
          <span className="ml-auto font-mono font-semibold">{brl(r.valorOriginal)}</span>
        </div>
      ))}
    </div>
  )
}

function FontePNCP({ registros }: { registros: RegistroRelatorio[] }) {
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
            <tr key={r.indice} className={`${r.isOutlier ? 'bg-amber-50' : ''} ${r.utilizado ? '' : 'opacity-60'}`}>
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
                {r.isOutlier && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" aria-label="Preco discrepante" />}
                {!r.utilizado && <span className="block text-[10px] uppercase text-gray-400">nao utilizada</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ItemRegistros({
  fontes,
  precosUtilizados,
  propostasEncontradas,
}: {
  fontes: FonteRelatorio[]
  precosUtilizados: number
  propostasEncontradas: number
}) {
  const [expandido, setExpandido] = useState(false)
  const temExtras = propostasEncontradas > precosUtilizados

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Cotacoes utilizadas / encontradas: <strong>{precosUtilizados}/{propostasEncontradas}</strong>
        </span>
        {temExtras && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {expandido ? <><ChevronUp className="w-3.5 h-3.5" /> Ver apenas utilizadas</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas as {propostasEncontradas} cotacoes</>}
          </button>
        )}
      </div>

      {fontes.map((fonte) => {
        const registros = expandido ? fonte.registros : fonte.registros.filter((r) => r.utilizado)
        if (registros.length === 0) return null
        return (
          <div key={fonte.tipo}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {ROTULO_FONTE[fonte.tipo as TipoFontePreco]}
              </span>
              <span className="text-xs text-gray-400">
                Valor unitario: <strong className="text-gray-700">{brl(fonte.valorUnitario)}</strong>
              </span>
            </div>
            {fonte.tipo === 'preco_web' ? <FonteWeb registros={registros} /> : <FontePNCP registros={registros} />}
          </div>
        )
      })}

      {fontes.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">Nenhum preco encontrado para este item.</p>
      )}
    </div>
  )
}
